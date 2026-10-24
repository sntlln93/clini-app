<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\MembershipRole;
use App\Models\Patient;
use App\Models\User;
use App\Support\ClinicalAccess;

/**
 * The clinical access log (#325, ADR 0022). An exceptional access is declared by whoever may read the patient's
 * history, the same relationship as the notes (`ClinicalAccess::attends`). The list of exceptional accesses is the
 * owner's, who answers for the practice that holds the history: like billing (`SubscriptionPolicy`), it checks the
 * owner role itself, not a permission an admin also holds. It never carries clinical content.
 */
class ClinicalAccessLogPolicy
{
    public function declareExceptional(User $user, Patient $patient): bool
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
