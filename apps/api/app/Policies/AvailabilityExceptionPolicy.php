<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\Permission;
use App\Models\AvailabilityException;
use App\Models\User;
use App\Support\CurrentOrganization;

class AvailabilityExceptionPolicy extends OrganizationScopedPolicy
{
    /**
     * The index spans the whole organization, so there is no membership_id to narrow layer 3 by.
     */
    public function viewAny(User $user): bool
    {
        return $this->allows($user, Permission::AvailabilityView, new AvailabilityException([
            'organization_id' => app(CurrentOrganization::class)->get(),
        ]));
    }

    /**
     * A null membership_id (org-wide exception) makes layer 3 deny a holder of only availability.manage.own.
     */
    public function create(User $user, ?int $membershipId): bool
    {
        return $this->allows($user, Permission::AvailabilityManage, new AvailabilityException([
            'organization_id' => app(CurrentOrganization::class)->get(),
            'membership_id' => $membershipId,
        ]));
    }

    public function update(User $user, AvailabilityException $availabilityException): bool
    {
        return $this->allows($user, Permission::AvailabilityManage, $availabilityException);
    }

    public function delete(User $user, AvailabilityException $availabilityException): bool
    {
        return $this->allows($user, Permission::AvailabilityManage, $availabilityException);
    }
}
