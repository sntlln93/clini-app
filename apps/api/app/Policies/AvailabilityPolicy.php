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
     * unsaved-resource trick as replace() is used: without it, layer 1 (the
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
     * There is no persisted resource for a whole week, so an unsaved
     * Availability carrying the target membership's organization_id/
     * membership_id is passed to allows() so layer 1 (tenant) and layer 3
     * (own-scoped) still resolve correctly.
     */
    public function replace(User $user, Membership $membership): bool
    {
        return $this->allows($user, Permission::AvailabilityManage, new Availability([
            'organization_id' => $membership->organization_id,
            'membership_id' => $membership->id,
        ]));
    }
}
