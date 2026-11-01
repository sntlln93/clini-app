<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\Permission;
use App\Models\Availability;
use App\Models\Membership;
use App\Models\User;

class AvailabilityPolicy extends OrganizationScopedPolicy
{
    /**
     * Without the unsaved resource layer 1 (tenant) never runs, and any organization's membership id would authorize.
     */
    public function viewAny(User $user, Membership $membership): bool
    {
        return $this->allows($user, Permission::AvailabilityView, new Availability([
            'organization_id' => $membership->organization_id,
            'membership_id' => $membership->id,
        ]));
    }

    /**
     * An unsaved resource carries the target membership so layers 1 and 3 can resolve.
     */
    public function replace(User $user, Membership $membership): bool
    {
        return $this->allows($user, Permission::AvailabilityManage, new Availability([
            'organization_id' => $membership->organization_id,
            'membership_id' => $membership->id,
        ]));
    }
}
