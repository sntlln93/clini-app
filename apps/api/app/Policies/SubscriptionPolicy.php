<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\MembershipRole;
use App\Models\User;

/**
 * Billing is the owner's call, not a delegable permission: the product
 * permission matrix has no billing entry, so `create` (checkout) and
 * `delete` (cancellation) check the owner role itself rather than a
 * Permission (admins hold every org-wide permission an owner does).
 * Reading the status is open to any active member, since every member
 * sees the read-only restriction it drives. Every check goes through currentMembership(), which is already scoped to
 * the current organization.
 */
class SubscriptionPolicy
{
    public function view(User $user): bool
    {
        return $user->currentMembership() !== null;
    }

    public function create(User $user): bool
    {
        return $this->isOwner($user);
    }

    public function delete(User $user): bool
    {
        return $this->isOwner($user);
    }

    private function isOwner(User $user): bool
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
