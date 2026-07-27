<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\MembershipStatus;
use App\Enums\Permission;
use App\Models\User;
use App\Support\CurrentOrganization;

/**
 * user_specialties is the professional's global credential: it travels
 * with the person, not with any organization. Unlike every other policy
 * in this app it does NOT extend OrganizationScopedPolicy — there is no
 * organization_id to scope by and no membership involved. The only check
 * that matters is identity: a user may only manage their own credential,
 * regardless of which organization (if any) is currently active.
 *
 * The one exception is reading (viewAny): an admin/owner with catalog
 * permissions may view another professional's credential, but only when
 * that professional has an active membership in the actor's currently
 * active organization — this keeps the credential from leaking across
 * unrelated organizations. create()/delete() remain identity-only.
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
