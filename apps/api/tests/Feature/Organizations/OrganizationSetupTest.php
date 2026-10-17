<?php

declare(strict_types=1);

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Availability;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\ProfessionalService;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('a guest gets 401 on the setup progress', function () {
    $this->getJson('/api/v1/organization/setup')->assertStatus(401);
});

test('a member who does not manage the team gets 403', function (string $role) {
    $membership = Membership::factory()->{$role}()->create();

    $this->actingAs($membership->user)->getJson('/api/v1/organization/setup')->assertStatus(403);
})->with(['professional', 'staff']);

test('a new practice with no professional has every step pending', function (string $role) {
    $membership = Membership::factory()->{$role}()->create();

    $this->actingAs($membership->user)
        ->getJson('/api/v1/organization/setup')
        ->assertOk()
        ->assertExactJson(['data' => [
            'has_professional' => false,
            'has_service' => false,
            'has_availability' => false,
            'ready' => false,
        ]]);
})->with(['owner', 'admin']);

test('an owner who attends counts as the professional, without services or hours yet', function () {
    $owner = Membership::factory()->withRoles(MembershipRole::Owner, MembershipRole::Professional)->create();

    $this->actingAs($owner->user)
        ->getJson('/api/v1/organization/setup')
        ->assertOk()
        ->assertJsonPath('data.has_professional', true)
        ->assertJsonPath('data.has_service', false)
        ->assertJsonPath('data.has_availability', false)
        ->assertJsonPath('data.ready', false);
});

test('a professional with an active service and weekly hours makes the practice ready', function () {
    $owner = Membership::factory()->withRoles(MembershipRole::Owner, MembershipRole::Professional)->create();
    ProfessionalService::factory()->create(['organization_id' => $owner->organization_id, 'membership_id' => $owner->id]);
    Availability::factory()->create(['organization_id' => $owner->organization_id, 'membership_id' => $owner->id]);

    $this->actingAs($owner->user)
        ->getJson('/api/v1/organization/setup')
        ->assertOk()
        ->assertExactJson(['data' => [
            'has_professional' => true,
            'has_service' => true,
            'has_availability' => true,
            'ready' => true,
        ]]);
});

test('an inactive service, a non-professional or another practice does not complete a step', function () {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $professional = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    ProfessionalService::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $professional->id,
        'active' => false,
    ]);
    // Hours left behind by an owner who stopped attending.
    Availability::factory()->create(['organization_id' => $organization->id, 'membership_id' => $owner->id]);
    $other = Membership::factory()->professional()->create();
    ProfessionalService::factory()->create(['organization_id' => $other->organization_id, 'membership_id' => $other->id]);
    Availability::factory()->create(['organization_id' => $other->organization_id, 'membership_id' => $other->id]);

    $this->actingAs($owner->user)
        ->getJson('/api/v1/organization/setup')
        ->assertOk()
        ->assertJsonPath('data.has_professional', true)
        ->assertJsonPath('data.has_service', false)
        ->assertJsonPath('data.has_availability', false);
});

test('a suspended professional does not count', function () {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $professional = Membership::factory()->professional()->create([
        'organization_id' => $organization->id,
        'status' => MembershipStatus::Suspended,
    ]);
    ProfessionalService::factory()->create(['organization_id' => $organization->id, 'membership_id' => $professional->id]);
    Availability::factory()->create(['organization_id' => $organization->id, 'membership_id' => $professional->id]);

    $this->actingAs($owner->user)
        ->getJson('/api/v1/organization/setup')
        ->assertOk()
        ->assertJsonPath('data.has_professional', false)
        ->assertJsonPath('data.ready', false);
});
