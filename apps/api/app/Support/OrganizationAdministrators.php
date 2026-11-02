<?php

declare(strict_types=1);

namespace App\Support;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Membership;

/**
 * The CU-04/CU-05 invariant: an organization keeps at least one active owner or admin. Filters by the membership's own
 * organization instead of the tenant scope, so it holds with no current organization too (account deletion, #384).
 */
final class OrganizationAdministrators
{
    /**
     * @param  array<int, MembershipRole>  $roles
     */
    public static function includesOwnerOrAdmin(array $roles): bool
    {
        return collect($roles)->contains(
            fn (MembershipRole $role): bool => in_array($role, [MembershipRole::Owner, MembershipRole::Admin], true)
        );
    }

    /**
     * Locks the organization's other active memberships, so two concurrent changes can't both pass and leave none.
     */
    public static function anotherActiveExists(Membership $membership): bool
    {
        return Membership::withoutGlobalScope('organization')
            ->where('organization_id', $membership->organization_id)
            ->whereKeyNot($membership->id)
            ->where('status', MembershipStatus::Active)
            ->lockForUpdate()
            ->get()
            ->contains(function (Membership $other): bool {
                /** @var array<int, MembershipRole> $roles */
                $roles = $other->roles;

                return self::includesOwnerOrAdmin($roles);
            });
    }
}
