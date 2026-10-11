<?php

declare(strict_types=1);

use App\Models\Membership;
use App\Models\Organization;
use App\Models\OrganizationLogo;
use App\Models\Subscription;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

function storeLogo(Organization $organization, string $contents = "\x89PNG-logo", string $mimeType = 'image/png'): OrganizationLogo
{
    return OrganizationLogo::query()->create([
        'organization_id' => $organization->id,
        'mime_type' => $mimeType,
        'content' => base64_encode($contents),
        'checksum' => hash('sha256', $contents),
    ]);
}

function logoUrlFor(Organization $organization, string $contents = "\x89PNG-logo"): string
{
    return config('app.url')."/api/v1/booking/{$organization->slug}/logo?v=".substr(hash('sha256', $contents), 0, 16);
}

test('on Free the booking page shows the Clini mark and no logo, even with one kept from a paid plan', function () {
    $organization = Organization::factory()->create();
    storeLogo($organization);

    $this->getJson("/api/v1/booking/{$organization->slug}")
        ->assertOk()
        ->assertJsonPath('organization.show_clini_mark', true)
        ->assertJsonPath('organization.logo_url', null);
});

test('a paid plan drops the Clini mark and shows the logo when there is one', function (string $plan) {
    $organization = $plan === 'center'
        ? Organization::factory()->center()->create()
        : Organization::factory()->create();
    if ($plan === 'practice') {
        Subscription::factory()->create(['organization_id' => $organization->id]);
    }

    $this->getJson("/api/v1/booking/{$organization->slug}")
        ->assertOk()
        ->assertJsonPath('organization.show_clini_mark', false)
        ->assertJsonPath('organization.logo_url', null);

    storeLogo($organization);
    app(CurrentOrganization::class)->set(null);

    $this->getJson("/api/v1/booking/{$organization->slug}")
        ->assertOk()
        ->assertJsonPath('organization.show_clini_mark', false)
        ->assertJsonPath('organization.logo_url', logoUrlFor($organization));
})->with(['practice', 'center']);

test('a professional booking link carries the organization branding too', function () {
    $organization = Organization::factory()->center()->create();
    Membership::factory()->professional()->create(['organization_id' => $organization->id, 'slug' => 'dra-lopez']);
    storeLogo($organization);

    $this->getJson('/api/v1/booking/dra-lopez')
        ->assertOk()
        ->assertJsonPath('organization.show_clini_mark', false)
        ->assertJsonPath('organization.logo_url', logoUrlFor($organization));
});

test('the logo URL comes from APP_URL, not from the request host or scheme', function () {
    config(['app.url' => 'https://api.clini.test']);
    $organization = Organization::factory()->center()->create(['slug' => 'consultorio-salud']);
    storeLogo($organization);

    $this->getJson('http://internal-host/api/v1/booking/consultorio-salud')
        ->assertOk()
        ->assertJsonPath('organization.logo_url', fn (string $url) => str_starts_with($url, 'https://api.clini.test/api/v1/booking/consultorio-salud/logo?v='));
});

test('the logo route serves the stored image with its type, caching and nosniff', function () {
    $organization = Organization::factory()->center()->create();
    storeLogo($organization, "\xFF\xD8jpeg-bytes", 'image/jpeg');

    $response = $this->get("/api/v1/booking/{$organization->slug}/logo");

    $response->assertOk();
    expect($response->getContent())->toBe("\xFF\xD8jpeg-bytes");
    $response->assertHeader('Content-Type', 'image/jpeg');
    $response->assertHeader('X-Content-Type-Options', 'nosniff');
    expect($response->headers->get('Cache-Control'))->toContain('max-age=86400')->toContain('public');
});

test('the logo route serves a logo kept after a downgrade, so the panel can preview it', function () {
    $organization = Organization::factory()->create();
    storeLogo($organization);

    $this->get("/api/v1/booking/{$organization->slug}/logo")->assertOk();
});

test('the logo route returns 404 without a logo, and never serves another organization logo', function () {
    $organization = Organization::factory()->center()->create();
    storeLogo(Organization::factory()->center()->create());

    $this->getJson("/api/v1/booking/{$organization->slug}/logo")->assertNotFound();
    $this->getJson('/api/v1/booking/no-existe/logo')->assertNotFound();
});

test('a suspended organization does not serve its logo', function () {
    $organization = Organization::factory()->center()->create(['suspended_at' => now()]);
    storeLogo($organization);

    $this->getJson("/api/v1/booking/{$organization->slug}/logo")->assertForbidden();
});
