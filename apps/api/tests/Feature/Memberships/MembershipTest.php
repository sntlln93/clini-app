<?php

declare(strict_types=1);

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\Permission;
use App\Models\Membership;
use App\Models\Organization;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('index lists only the active organization\'s memberships', function () {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $sameOrgMember = Membership::factory()->create(['organization_id' => $organization->id]);
    $otherOrgMembership = Membership::factory()->create();

    $response = $this->actingAs($owner->user)->getJson('/api/v1/memberships');

    $response->assertOk();
    $ids = collect($response->json('data'))->pluck('id');
    expect($ids)->toContain($owner->id, $sameOrgMember->id);
    expect($ids)->not->toContain($otherOrgMembership->id);
});

test('a user without MembershipsView permission gets 403 on index', function () {
    $staff = Membership::factory()->staff()->create();

    $response = $this->actingAs($staff->user)->getJson('/api/v1/memberships');

    $response->assertStatus(403);
});

test('a guest gets 401 on index, update and destroy', function () {
    $membership = Membership::factory()->create();

    $this->getJson('/api/v1/memberships')->assertStatus(401);
    $this->patchJson("/api/v1/memberships/{$membership->id}", [
        'roles' => ['staff'],
        'status' => 'active',
    ])->assertStatus(401);
    $this->deleteJson("/api/v1/memberships/{$membership->id}")->assertStatus(401);
});

test('update changes roles and status and persists the roles array', function () {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $target = Membership::factory()->staff()->create(['organization_id' => $organization->id]);

    $response = $this->actingAs($owner->user)->patchJson("/api/v1/memberships/{$target->id}", [
        'roles' => ['professional', 'staff'],
        'status' => 'suspended',
    ]);

    $response->assertOk();
    $target->refresh();
    expect($target->status)->toBe(MembershipStatus::Suspended);
    expect(array_map(fn (MembershipRole $role): string => $role->value, $target->roles))
        ->toBe(['professional', 'staff']);
});

test('update with an unknown role value returns 422', function () {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $target = Membership::factory()->staff()->create(['organization_id' => $organization->id]);

    $response = $this->actingAs($owner->user)->patchJson("/api/v1/memberships/{$target->id}", [
        'roles' => ['bogus-role'],
        'status' => 'active',
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors('roles.0');
});

test('update with an empty roles array returns 422', function () {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $target = Membership::factory()->staff()->create(['organization_id' => $organization->id]);

    $response = $this->actingAs($owner->user)->patchJson("/api/v1/memberships/{$target->id}", [
        'roles' => [],
        'status' => 'active',
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors('roles');
});

test('update with duplicate roles returns 422', function () {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $target = Membership::factory()->staff()->create(['organization_id' => $organization->id]);

    $response = $this->actingAs($owner->user)->patchJson("/api/v1/memberships/{$target->id}", [
        'roles' => ['admin', 'admin'],
        'status' => 'active',
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors('roles.0');
});

test('update never reads organization_id from the payload', function () {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $target = Membership::factory()->staff()->create(['organization_id' => $organization->id]);
    $otherOrganization = Organization::factory()->create();

    $response = $this->actingAs($owner->user)->patchJson("/api/v1/memberships/{$target->id}", [
        'organization_id' => $otherOrganization->id,
        'roles' => ['staff'],
        'status' => 'active',
    ]);

    $response->assertOk();
    $target->refresh();
    expect($target->organization_id)->toBe($organization->id);
});

test('update on a membership of another organization returns 403', function () {
    $owner = Membership::factory()->owner()->create();
    $otherOrgMembership = Membership::factory()->create();

    $response = $this->actingAs($owner->user)->patchJson("/api/v1/memberships/{$otherOrgMembership->id}", [
        'roles' => ['staff'],
        'status' => 'active',
    ]);

    $response->assertStatus(403);
});

test('demoting the organization\'s only active owner/admin returns 422 with a Spanish message', function () {
    $organization = Organization::factory()->create();
    $soleOwner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $manager = Membership::factory()->staff()->create([
        'organization_id' => $organization->id,
        'extra_permissions' => [Permission::MembershipsManage],
    ]);

    $response = $this->actingAs($manager->user)->patchJson("/api/v1/memberships/{$soleOwner->id}", [
        'roles' => ['professional'],
        'status' => 'active',
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors('roles');
    expect($response->json('errors.roles.0'))
        ->toBe('La organización debe mantener al menos un miembro activo con rol de propietario o administrador.');
});

test('a user dropping their own owner/admin roles returns 422 with a Spanish message', function () {
    $organization = Organization::factory()->create();
    $self = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    Membership::factory()->owner()->create(['organization_id' => $organization->id]);

    $response = $this->actingAs($self->user)->patchJson("/api/v1/memberships/{$self->id}", [
        'roles' => ['professional'],
        'status' => 'active',
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors('roles');
    expect($response->json('errors.roles.0'))
        ->toBe('No podés quitarte a vos mismo el rol de propietario o administrador.');
});

test('a user suspending themselves returns 422 with a Spanish message', function () {
    $organization = Organization::factory()->create();
    $self = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    Membership::factory()->owner()->create(['organization_id' => $organization->id]);

    $response = $this->actingAs($self->user)->patchJson("/api/v1/memberships/{$self->id}", [
        'roles' => ['owner'],
        'status' => 'suspended',
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors('status');
    expect($response->json('errors.status.0'))
        ->toBe('No podés desactivar o suspender tu propia membresía.');
});

test('destroy soft-deletes and sets status to inactive without force-deleting', function () {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $target = Membership::factory()->professional()->create(['organization_id' => $organization->id]);

    $response = $this->actingAs($owner->user)->deleteJson("/api/v1/memberships/{$target->id}");

    $response->assertNoContent();
    $trashed = Membership::withTrashed()->find($target->id);
    expect($trashed)->not->toBeNull();
    expect($trashed->status)->toBe(MembershipStatus::Inactive);
    expect($trashed->deleted_at)->not->toBeNull();
});

test('deactivating the last active owner/admin returns 422 with a Spanish message', function () {
    $organization = Organization::factory()->create();
    $soleOwner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $manager = Membership::factory()->staff()->create([
        'organization_id' => $organization->id,
        'extra_permissions' => [Permission::MembershipsManage],
    ]);

    $response = $this->actingAs($manager->user)->deleteJson("/api/v1/memberships/{$soleOwner->id}");

    $response->assertStatus(422);
    $response->assertJsonValidationErrors('membership');
    expect($response->json('errors.membership.0'))
        ->toBe('La organización debe mantener al menos un miembro activo con rol de propietario o administrador.');
});

test('destroy on a membership of another organization returns 403', function () {
    $owner = Membership::factory()->owner()->create();
    $otherOrgMembership = Membership::factory()->create();

    $response = $this->actingAs($owner->user)->deleteJson("/api/v1/memberships/{$otherOrgMembership->id}");

    $response->assertStatus(403);
});
