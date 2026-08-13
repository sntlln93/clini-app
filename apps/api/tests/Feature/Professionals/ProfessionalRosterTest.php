<?php

declare(strict_types=1);

use App\Enums\MembershipStatus;
use App\Models\Membership;
use App\Models\Organization;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('a Staff user gets 200 and the payload lists the organization\'s active professional memberships', function () {
    $organization = Organization::factory()->create();
    $staff = Membership::factory()->staff()->create(['organization_id' => $organization->id]);
    $professional = Membership::factory()->professional()->create(['organization_id' => $organization->id]);

    $response = $this->actingAs($staff->user)->getJson('/api/v1/professionals');

    $response->assertOk();
    $ids = collect($response->json('data'))->pluck('id');
    expect($ids)->toContain($professional->id);
});

test('each roster item exposes exactly id and user{id,name,email}', function () {
    $organization = Organization::factory()->create();
    $staff = Membership::factory()->staff()->create(['organization_id' => $organization->id]);
    Membership::factory()->professional()->create(['organization_id' => $organization->id]);

    $response = $this->actingAs($staff->user)->getJson('/api/v1/professionals');

    $response->assertOk();
    $item = $response->json('data.0');
    expect(array_keys($item))->toEqualCanonicalizing(['id', 'user']);
    expect(array_keys($item['user']))->toEqualCanonicalizing(['id', 'name', 'email']);
});

test('an Owner also gets 200 and the same roster', function () {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $professional = Membership::factory()->professional()->create(['organization_id' => $organization->id]);

    $response = $this->actingAs($owner->user)->getJson('/api/v1/professionals');

    $response->assertOk();
    $ids = collect($response->json('data'))->pluck('id');
    expect($ids)->toContain($professional->id);
});

test('a user without appointments/availability permissions gets 403', function () {
    $professional = Membership::factory()->professional()->create();

    $response = $this->actingAs($professional->user)->getJson('/api/v1/professionals');

    $response->assertStatus(403);
});

test('a guest gets 401', function () {
    $this->getJson('/api/v1/professionals')->assertStatus(401);
});

test('memberships of another organization are never listed', function () {
    $organization = Organization::factory()->create();
    $staff = Membership::factory()->staff()->create(['organization_id' => $organization->id]);
    $otherOrgProfessional = Membership::factory()->professional()->create();

    $response = $this->actingAs($staff->user)->getJson('/api/v1/professionals');

    $response->assertOk();
    $ids = collect($response->json('data'))->pluck('id');
    expect($ids)->not->toContain($otherOrgProfessional->id);
});

test('non-professional memberships are excluded from the roster', function () {
    $organization = Organization::factory()->create();
    $staff = Membership::factory()->staff()->create(['organization_id' => $organization->id]);

    $response = $this->actingAs($staff->user)->getJson('/api/v1/professionals');

    $response->assertOk();
    $ids = collect($response->json('data'))->pluck('id');
    expect($ids)->not->toContain($staff->id);
});

test('soft-deleted and non-active professional memberships are excluded from the roster', function () {
    $organization = Organization::factory()->create();
    $staff = Membership::factory()->staff()->create(['organization_id' => $organization->id]);
    $inactiveProfessional = Membership::factory()->professional()->create([
        'organization_id' => $organization->id,
        'status' => MembershipStatus::Inactive,
    ]);
    $deletedProfessional = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $deletedProfessional->delete();

    $response = $this->actingAs($staff->user)->getJson('/api/v1/professionals');

    $response->assertOk();
    $ids = collect($response->json('data'))->pluck('id');
    expect($ids)->not->toContain($inactiveProfessional->id, $deletedProfessional->id);
});
