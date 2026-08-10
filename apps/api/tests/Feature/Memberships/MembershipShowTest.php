<?php

declare(strict_types=1);

use App\Models\Membership;
use App\Models\Organization;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('returns the membership with the user relation loaded', function () {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $target = Membership::factory()->create(['organization_id' => $organization->id]);

    $response = $this->actingAs($owner->user)->getJson("/api/v1/memberships/{$target->id}");

    $response->assertOk();
    expect($response->json('data.id'))->toBe($target->id);
    expect($response->json('data.user.id'))->toBe($target->user->id);
    expect($response->json('data.user.name'))->toBe($target->user->name);
    expect($response->json('data.user.email'))->toBe($target->user->email);
});

test('a soft-deleted membership of the current organization is returned, not 404', function () {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $target = Membership::factory()->staff()->create(['organization_id' => $organization->id]);
    $target->delete();

    $response = $this->actingAs($owner->user)->getJson("/api/v1/memberships/{$target->id}");

    $response->assertOk();
    expect($response->json('data.id'))->toBe($target->id);
});

test('a membership belonging to a different organization returns 404', function () {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);

    $otherOrgMembership = Membership::factory()->create();

    $response = $this->actingAs($owner->user)->getJson("/api/v1/memberships/{$otherOrgMembership->id}");

    $response->assertNotFound();
});

test('a non-existent id returns 404', function () {
    $owner = Membership::factory()->owner()->create();

    $response = $this->actingAs($owner->user)->getJson('/api/v1/memberships/999999');

    $response->assertNotFound();
});

test('an unauthenticated request returns 401', function () {
    $target = Membership::factory()->create();

    $response = $this->getJson("/api/v1/memberships/{$target->id}");

    $response->assertUnauthorized();
});
