<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\Permission;
use App\Models\Membership;
use App\Models\User;

class MembershipPolicy extends OrganizationScopedPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->allows($user, Permission::MembershipsView);
    }

    /**
     * Backs the agenda/availability professional roster (`GET /professionals`),
     * a different resource from membership administration, so it
     * deliberately does not require `memberships.view`.
     */
    public function viewProfessionalRoster(User $user): bool
    {
        return $this->allows($user, Permission::AppointmentsView)
            || $this->allows($user, Permission::AppointmentsCreate)
            || $this->allows($user, Permission::AppointmentsUpdate)
            || $this->allows($user, Permission::AvailabilityManage);
    }

    /**
     * Authorizes inviting a new member: there is no persisted Membership
     * yet at invite time, so this only checks the org-wide permission.
     */
    public function create(User $user): bool
    {
        return $this->allows($user, Permission::MembershipsManage);
    }

    public function view(User $user, Membership $membership): bool
    {
        return $this->allows($user, Permission::MembershipsView, $membership);
    }

    public function update(User $user, Membership $membership): bool
    {
        return $this->allows($user, Permission::MembershipsManage, $membership);
    }

    public function delete(User $user, Membership $membership): bool
    {
        return $this->allows($user, Permission::MembershipsManage, $membership);
    }
}
