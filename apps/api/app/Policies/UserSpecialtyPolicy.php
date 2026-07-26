<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;

/**
 * user_specialties is the professional's global credential: it travels
 * with the person, not with any organization. Unlike every other policy
 * in this app it does NOT extend OrganizationScopedPolicy — there is no
 * organization_id to scope by and no membership involved. The only check
 * that matters is identity: a user may only manage their own credential,
 * regardless of which organization (if any) is currently active.
 */
class UserSpecialtyPolicy
{
    public function viewAny(User $user, User $targetUser): bool
    {
        return $user->id === $targetUser->id;
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
