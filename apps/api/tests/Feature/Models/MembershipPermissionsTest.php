<?php

declare(strict_types=1);

use App\Enums\MembershipRole;
use App\Enums\Permission;
use App\Models\Membership;
use Illuminate\Support\Facades\DB;

test('roles and extra_permissions round-trip through the cast without loss', function () {
    $membership = Membership::factory()->create([
        'roles' => [MembershipRole::Owner, MembershipRole::Professional],
        'extra_permissions' => [Permission::CatalogManage],
    ]);

    $fresh = $membership->fresh();

    expect($fresh->roles)->toBe([MembershipRole::Owner, MembershipRole::Professional]);
    expect($fresh->extra_permissions)->toBe([Permission::CatalogManage]);
});

test('the cast discards unknown role/permission strings on read', function () {
    $membership = Membership::factory()->create();

    DB::table('memberships')->where('id', $membership->id)->update([
        'roles' => json_encode(['owner', 'not-a-role']),
        'extra_permissions' => json_encode(['catalog.manage', 'not-a-permission']),
    ]);

    $fresh = $membership->fresh();

    expect($fresh->roles)->toBe([MembershipRole::Owner]);
    expect($fresh->extra_permissions)->toBe([Permission::CatalogManage]);
});

test('permissions() returns the union of every role preset without duplicates', function () {
    $membership = Membership::factory()->create([
        'roles' => [MembershipRole::Owner, MembershipRole::Professional],
        'extra_permissions' => [],
    ]);

    $expected = collect(MembershipRole::Owner->permissions())
        ->merge(MembershipRole::Professional->permissions())
        ->unique(fn (Permission $permission): string => $permission->value)
        ->values()
        ->all();

    expect($membership->permissions())->toEqual($expected);

    $values = array_map(fn (Permission $permission): string => $permission->value, $membership->permissions());

    expect($values)->toBe(array_unique($values));
});

test('permissions() includes extra_permissions in addition to the role presets', function () {
    $membership = Membership::factory()->staff()->create([
        'extra_permissions' => [Permission::OrganizationManage],
    ]);

    $expected = collect(MembershipRole::Staff->permissions())
        ->push(Permission::OrganizationManage)
        ->unique(fn (Permission $permission): string => $permission->value)
        ->values()
        ->all();

    expect($membership->permissions())->toContain(Permission::OrganizationManage);
    expect($membership->permissions())->toEqual($expected);
});

test('hasPermission() implies the .own variant from its org-wide permission but not the reverse', function () {
    $withOrgWide = Membership::factory()->create([
        'roles' => [],
        'extra_permissions' => [Permission::AppointmentsUpdate],
    ]);

    expect($withOrgWide->hasPermission(Permission::AppointmentsUpdateOwn))->toBeTrue();

    $professional = Membership::factory()->professional()->create();

    expect($professional->hasPermission(Permission::AppointmentsUpdate))->toBeFalse();
});

test('a membership with no roles and no extra permissions has no effective permissions', function () {
    $membership = Membership::factory()->create([
        'roles' => [],
        'extra_permissions' => [],
    ]);

    expect($membership->permissions())->toBe([]);
});
