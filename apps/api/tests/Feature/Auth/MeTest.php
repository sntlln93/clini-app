<?php

declare(strict_types=1);

use App\Enums\MembershipRole;
use App\Enums\Permission;
use App\Models\Membership;
use App\Models\User;

test('a user with an active membership gets user fields plus organization, roles and permissions on /me', function () {
    $membership = Membership::factory()->staff()->create();
    $user = $membership->user;

    $response = $this->actingAs($user)->getJson('/api/v1/me');

    $response->assertOk()
        ->assertJsonPath('id', $user->id)
        ->assertJsonPath('name', $user->name)
        ->assertJsonPath('email', $user->email)
        ->assertJsonPath('organization.id', $membership->organization_id)
        ->assertJsonPath('organization.name', $membership->organization->name);

    expect($response->json('roles'))->not->toBeNull();
    expect($response->json('permissions'))->not->toBeNull();
});

test('permissions and roles reflect the effective permissions and roles of the active membership', function () {
    $membership = Membership::factory()->staff()->create([
        'extra_permissions' => [Permission::OrganizationManage],
    ]);
    $user = $membership->user;

    $response = $this->actingAs($user)->getJson('/api/v1/me');

    $expectedPermissions = array_map(fn (Permission $permission): string => $permission->value, $membership->permissions());
    $expectedRoles = array_map(fn (MembershipRole $role): string => $role->value, $membership->roles);

    $response->assertOk();
    expect($response->json('permissions'))->toEqualCanonicalizing($expectedPermissions);
    expect($response->json('roles'))->toEqualCanonicalizing($expectedRoles);
});

test('a user with no active membership gets a null organization and empty roles/permissions on /me', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->getJson('/api/v1/me');

    $response->assertOk()
        ->assertJsonPath('organization', null)
        ->assertJsonPath('roles', [])
        ->assertJsonPath('permissions', []);
});

test('with two active memberships, /me reflects the same organization the middleware would resolve (the most recent)', function () {
    $user = User::factory()->create();

    Membership::factory()->create(['user_id' => $user->id, 'created_at' => now()->subDay()]);
    $newer = Membership::factory()->create(['user_id' => $user->id, 'created_at' => now()]);

    $response = $this->actingAs($user)->getJson('/api/v1/me');

    $response->assertOk()->assertJsonPath('organization.id', $newer->organization_id);
});
