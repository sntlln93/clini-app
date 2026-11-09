<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\MembershipRole;
use App\Models\User;

/**
 * Billing checks the owner role, not a Permission (admins hold every org-wide one); any member reads the status, since
 * every member sees the read-only restriction it drives.
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

    /**
     * The subscription's invoices (#246): the owner's, who pays it.
     */
    public function viewInvoices(User $user): bool
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
