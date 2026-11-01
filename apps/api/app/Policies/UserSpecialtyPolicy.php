<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\MembershipStatus;
use App\Enums\Permission;
use App\Models\User;
use App\Support\CurrentOrganization;

/**
 * A global credential with no organization_id, so identity-only; viewAny() opens to catalog holders only for active
 * members of their organization, so it doesn't leak across organizations.
 */
class UserSpecialtyPolicy
{
    public function viewAny(User $user, User $targetUser): bool
    {
        if ($user->id === $targetUser->id) {
            return true;
        }

        $organizationId = app(CurrentOrganization::class)->get();
        $membership = $user->currentMembership();

        if ($organizationId === null || $membership === null) {
            return false;
        }

        $effective = $membership->permissions();

        if (! in_array(Permission::CatalogView, $effective, true)
            && ! in_array(Permission::CatalogManage, $effective, true)) {
            return false;
        }

        return $targetUser->memberships()
            ->where('organization_id', $organizationId)
            ->where('status', MembershipStatus::Active)
            ->exists();
    }

    public function create(User $user, User $targetUser): bool
    {
        return $user->id === $targetUser->id;
    }

    public function delete(User $user, User $targetUser): bool
    {
        return $user->id === $targetUser->id;
    }
}
