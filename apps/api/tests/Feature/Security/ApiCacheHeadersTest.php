<?php

declare(strict_types=1);

use App\Models\Membership;
use App\Models\Organization;
use App\Models\OrganizationLogo;
use App\Support\CurrentOrganization;
use Illuminate\Support\Facades\Storage;

// A browser keeps a `no-cache` response on disk and only revalidates it, so
// a patient read would outlive the session on a shared computer (Res. AAIP
// 47/2018, A.2.2). Every API answer is `no-store` unless it says it is public.

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('an authenticated read is never stored by the browser', function () {
    $membership = Membership::factory()->create();

    $response = fromPanel()->actingAs($membership->user)->getJson('/api/v1/patients');

    $response->assertOk();
    expect($response->headers->hasCacheControlDirective('no-store'))->toBeTrue()
        ->and($response->headers->hasCacheControlDirective('private'))->toBeTrue();
});

test('an error answer is not stored either', function () {
    $response = fromPanel()->getJson('/api/v1/me');

    $response->assertUnauthorized();
    expect($response->headers->hasCacheControlDirective('no-store'))->toBeTrue();
});

test('a response that declares itself public keeps its own cache policy', function () {
    Storage::fake(OrganizationLogo::DISK);
    $organization = Organization::factory()->create();
    $path = "organization-logos/{$organization->id}/logo";
    Storage::disk(OrganizationLogo::DISK)->put($path, "\x89PNG-logo");
    OrganizationLogo::query()->create([
        'organization_id' => $organization->id,
        'mime_type' => 'image/png',
        'path' => $path,
        'checksum' => hash('sha256', "\x89PNG-logo"),
    ]);

    $response = $this->get("/api/v1/booking/{$organization->slug}/logo");

    $response->assertOk();
    expect($response->headers->hasCacheControlDirective('public'))->toBeTrue()
        ->and($response->headers->hasCacheControlDirective('no-store'))->toBeFalse();
});
