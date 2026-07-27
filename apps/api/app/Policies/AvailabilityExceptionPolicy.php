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
     * Exceptions aren't scoped to a single membership route param (the
     * index lists the whole organization, optionally filtered), so the
     * unsaved resource here only carries the current organization id —
     * there is no membership_id to narrow layer 3 by.
     */
    public function viewAny(User $user): bool
    {
        return $this->allows($user, Permission::AvailabilityView, new AvailabilityException([
            'organization_id' => app(CurrentOrganization::class)->get(),
        ]));
    }

    /**
     * The unsaved resource carries the given membership_id (null for an
     * org-wide exception) so layer 3 (own-scoped) correctly denies an
     * org-wide create to a holder of only availability.manage.own.
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
