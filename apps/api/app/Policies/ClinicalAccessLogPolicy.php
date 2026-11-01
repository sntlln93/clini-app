<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\MembershipRole;
use App\Models\Patient;
use App\Models\User;
use App\Support\ClinicalAccess;

/**
 * The exceptional-access list checks the owner role itself, not a permission an admin also holds.
 */
class ClinicalAccessLogPolicy
{
    public function declareExceptional(User $user, Patient $patient): bool
    {
        return ClinicalAccess::attends($user, $patient);
    }

    public function viewTrail(User $user, Patient $patient): bool
    {
        return ClinicalAccess::attends($user, $patient);
    }

    public function viewExceptional(User $user): bool
    {
        $membership = $user->currentMembership();

        if ($membership === null) {
            return false;
        }

        /** @var array<int, MembershipRole> $roles */
        $roles = $membership->roles;

        return in_array(MembershipRole::Owner, $roles, true);
    }
}
