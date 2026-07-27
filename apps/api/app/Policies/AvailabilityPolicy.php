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
     * There is no persisted resource to check here either, so the same
     * unsaved-resource trick as create() is used: without it, layer 1 (the
     * tenant check) never runs and any membership id from any organization
     * would authorize.
     */
    public function viewAny(User $user, Membership $membership): bool
    {
        return $this->allows($user, Permission::AvailabilityView, new Availability([
            'organization_id' => $membership->organization_id,
            'membership_id' => $membership->id,
        ]));
    }

    /**
     * There is no persisted resource yet at create time, so an unsaved
     * Availability carrying the target membership's organization_id/
     * membership_id is passed to allows() so layer 3 (own-scoped) still
     * resolves correctly.
     */
    public function create(User $user, Membership $membership): bool
    {
        return $this->allows($user, Permission::AvailabilityManage, new Availability([
            'organization_id' => $membership->organization_id,
            'membership_id' => $membership->id,
        ]));
    }

    public function update(User $user, Availability $availability): bool
    {
        return $this->allows($user, Permission::AvailabilityManage, $availability);
    }

    public function delete(User $user, Availability $availability): bool
    {
        return $this->allows($user, Permission::AvailabilityManage, $availability);
    }
}
