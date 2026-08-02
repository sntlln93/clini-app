<?php

declare(strict_types=1);

use App\Enums\ErrorCode;
use App\Models\Membership;
use App\Models\Organization;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('a guest gets 401 on PATCH /memberships/me/slug', function () {
    $this->patchJson('/api/v1/memberships/me/slug', ['slug' => 'algun-slug'])->assertStatus(401);
});

test('a professional sets a valid slug: 200, persisted on their own membership, and the response exposes slug', function () {
    $organization = Organization::factory()->create();
    $membership = Membership::factory()->professional()->create(['organization_id' => $organization->id]);

    $response = $this->actingAs($membership->user)->patchJson('/api/v1/memberships/me/slug', [
        'slug' => 'dra-lopez',
    ]);

    $response->assertOk();
    expect($response->json('data.slug'))->toBe('dra-lopez');
    $membership->refresh();
    expect($membership->slug)->toBe('dra-lopez');
});

test('invalid slug formats return 409 memberships.slug_invalid_format, never 422', function (string $invalidSlug) {
    $organization = Organization::factory()->create();
    $membership = Membership::factory()->professional()->create(['organization_id' => $organization->id]);

    $response = $this->actingAs($membership->user)->patchJson('/api/v1/memberships/me/slug', [
        'slug' => $invalidSlug,
    ]);

    $response->assertStatus(409);
    expect($response->status())->not->toBe(422);
    $response->assertJsonPath('error.code', ErrorCode::MembershipsSlugInvalidFormat->value);
})->with([
    'uppercase and space' => ['Dr Gomez'],
    'underscore' => ['dr_gomez'],
    'leading hyphen' => ['-dr-gomez'],
    'double hyphen' => ['dr--gomez'],
    'too short' => ['ab'],
]);

test('a slug equal to an existing organizations.slug returns 409 memberships.slug_taken', function () {
    $organization = Organization::factory()->create();
    $takenOrganization = Organization::factory()->create(['slug' => 'consultorio-salud']);
    $membership = Membership::factory()->professional()->create(['organization_id' => $organization->id]);

    $response = $this->actingAs($membership->user)->patchJson('/api/v1/memberships/me/slug', [
        'slug' => $takenOrganization->slug,
    ]);

    $response->assertStatus(409);
    $response->assertJsonPath('error.code', ErrorCode::MembershipsSlugTaken->value);
});

test('a slug already used by another membership in a different organization returns 409 memberships.slug_taken', function () {
    $organization = Organization::factory()->create();
    $membership = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $otherOrganization = Organization::factory()->create();
    Membership::factory()->professional()->create([
        'organization_id' => $otherOrganization->id,
        'slug' => 'dr-gomez',
    ]);

    $response = $this->actingAs($membership->user)->patchJson('/api/v1/memberships/me/slug', [
        'slug' => 'dr-gomez',
    ]);

    $response->assertStatus(409);
    $response->assertJsonPath('error.code', ErrorCode::MembershipsSlugTaken->value);
});

test('re-saving the membership\'s own current slug returns 200: a membership never collides with itself', function () {
    $organization = Organization::factory()->create();
    $membership = Membership::factory()->professional()->create([
        'organization_id' => $organization->id,
        'slug' => 'dr-gomez',
    ]);

    $response = $this->actingAs($membership->user)->patchJson('/api/v1/memberships/me/slug', [
        'slug' => 'dr-gomez',
    ]);

    $response->assertOk();
    $membership->refresh();
    expect($membership->slug)->toBe('dr-gomez');
});

test('sending slug null or an empty string clears the slug and returns 200', function (?string $clearingValue) {
    $organization = Organization::factory()->create();
    $membership = Membership::factory()->professional()->create([
        'organization_id' => $organization->id,
        'slug' => 'dr-gomez',
    ]);

    $response = $this->actingAs($membership->user)->patchJson('/api/v1/memberships/me/slug', [
        'slug' => $clearingValue,
    ]);

    $response->assertOk();
    $membership->refresh();
    expect($membership->slug)->toBeNull();
})->with([
    'null' => [null],
    'empty string' => [''],
]);

test('a membership without the professional role gets 409 memberships.slug_not_allowed_for_role', function () {
    $organization = Organization::factory()->create();
    $membership = Membership::factory()->staff()->create(['organization_id' => $organization->id]);

    $response = $this->actingAs($membership->user)->patchJson('/api/v1/memberships/me/slug', [
        'slug' => 'staff-slug',
    ]);

    $response->assertStatus(409);
    $response->assertJsonPath('error.code', ErrorCode::MembershipsSlugNotAllowedForRole->value);
});

test('the endpoint only ever touches the caller\'s own membership', function () {
    $organization = Organization::factory()->create();
    $membership = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $otherMembership = Membership::factory()->professional()->create([
        'organization_id' => $organization->id,
        'slug' => 'otro-profesional',
    ]);

    $response = $this->actingAs($membership->user)->patchJson('/api/v1/memberships/me/slug', [
        'slug' => 'mi-slug',
    ]);

    $response->assertOk();
    $otherMembership->refresh();
    expect($otherMembership->slug)->toBe('otro-profesional');
});

test('a slug longer than 50 characters returns 422', function () {
    $organization = Organization::factory()->create();
    $membership = Membership::factory()->professional()->create(['organization_id' => $organization->id]);

    $response = $this->actingAs($membership->user)->patchJson('/api/v1/memberships/me/slug', [
        'slug' => str_repeat('a', 51),
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors('slug');
});
