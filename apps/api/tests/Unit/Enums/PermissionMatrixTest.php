<?php

declare(strict_types=1);

use App\Enums\MembershipRole;
use App\Enums\Permission;

/**
 * Transcribed by hand from the product matrix (issue #19), never derived from MembershipRole::permissions() — keeps this dataset an independent check, not a tautology.
 */
dataset('permissionMatrix', function (): Generator {
    $grantedByRole = [
        'owner' => [
            'patients.view', 'patients.create', 'patients.update',
            'appointments.view', 'appointments.create', 'appointments.update', 'appointments.cancel',
            'availability.view', 'availability.manage',
            'catalog.view', 'catalog.manage',
            'memberships.view', 'memberships.manage',
            'organization.view', 'organization.manage',
        ],
        'admin' => [
            'patients.view', 'patients.create', 'patients.update',
            'appointments.view', 'appointments.create', 'appointments.update', 'appointments.cancel',
            'availability.view', 'availability.manage',
            'catalog.view', 'catalog.manage',
            'memberships.view', 'memberships.manage',
            'organization.view', 'organization.manage',
        ],
        'staff' => [
            'patients.view', 'patients.create', 'patients.update',
            'appointments.view', 'appointments.create', 'appointments.update', 'appointments.cancel',
            'availability.view', 'availability.manage',
            'catalog.view',
        ],
        'professional' => [
            'patients.view', 'patients.create', 'patients.update',
            'appointments.view.own', 'appointments.create.own', 'appointments.update.own', 'appointments.cancel.own',
            'availability.view', 'availability.manage.own',
            'catalog.view', 'catalog.manage.own',
        ],
    ];

    foreach ($grantedByRole as $roleValue => $grantedPermissions) {
        $role = MembershipRole::from($roleValue);

        foreach (Permission::cases() as $permission) {
            $expected = in_array($permission->value, $grantedPermissions, true);

            yield "{$roleValue} / {$permission->value}" => [$role, $permission, $expected];
        }
    }
});

test('MembershipRole::permissions() matches the product permission matrix', function (MembershipRole $role, Permission $permission, bool $expected) {
    $actual = in_array($permission, $role->permissions(), true);

    expect($actual)->toBe($expected);
})->with('permissionMatrix');

test('every Permission case appears in at least one role preset', function () {
    $grantedAnywhere = collect(MembershipRole::cases())
        ->flatMap(fn (MembershipRole $role): array => $role->permissions())
        ->map(fn (Permission $permission): string => $permission->value)
        ->unique()
        ->values();

    $orphans = collect(Permission::cases())
        ->map(fn (Permission $permission): string => $permission->value)
        ->reject(fn (string $value) => $grantedAnywhere->contains($value))
        ->values();

    expect($orphans)->toBeEmpty(
        'Orphan permission(s) not present in any role preset: '.$orphans->implode(', ')
    );
});

test('every role preset returns only Permission instances without duplicates', function (MembershipRole $role) {
    $permissions = $role->permissions();

    foreach ($permissions as $permission) {
        expect($permission)->toBeInstanceOf(Permission::class);
    }

    $values = array_map(fn (Permission $permission): string => $permission->value, $permissions);

    expect($values)->toBe(array_unique($values));
})->with(MembershipRole::cases());

test('orgWide() maps each .own permission to its org-wide counterpart and isOwnScoped() is true for it', function () {
    $ownToOrgWide = [
        Permission::AppointmentsViewOwn->value => Permission::AppointmentsView,
        Permission::AppointmentsCreateOwn->value => Permission::AppointmentsCreate,
        Permission::AppointmentsUpdateOwn->value => Permission::AppointmentsUpdate,
        Permission::AppointmentsCancelOwn->value => Permission::AppointmentsCancel,
        Permission::AvailabilityManageOwn->value => Permission::AvailabilityManage,
        Permission::CatalogManageOwn->value => Permission::CatalogManage,
    ];

    foreach ($ownToOrgWide as $ownValue => $expectedOrgWide) {
        $own = Permission::from($ownValue);

        expect($own->isOwnScoped())->toBeTrue();
        expect($own->orgWide())->toBe($expectedOrgWide);
    }
});

test('orgWide() is null and isOwnScoped() is false for every org-wide permission', function () {
    $ownScoped = [
        Permission::AppointmentsViewOwn,
        Permission::AppointmentsCreateOwn,
        Permission::AppointmentsUpdateOwn,
        Permission::AppointmentsCancelOwn,
        Permission::AvailabilityManageOwn,
        Permission::CatalogManageOwn,
    ];

    $orgWidePermissions = array_filter(
        Permission::cases(),
        fn (Permission $permission): bool => ! in_array($permission, $ownScoped, true),
    );

    foreach ($orgWidePermissions as $permission) {
        expect($permission->isOwnScoped())->toBeFalse();
        expect($permission->orgWide())->toBeNull();
    }
});
