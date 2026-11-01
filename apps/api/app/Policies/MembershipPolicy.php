<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\Permission;
use App\Models\Appointment;
use App\Models\Membership;
use App\Models\User;

class MembershipPolicy extends OrganizationScopedPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->allows($user, Permission::MembershipsView);
    }

    /**
     * The agenda's roster (`GET /professionals`) isn't membership administration, so it skips `memberships.view`.
     */
    public function viewProfessionalRoster(User $user): bool
    {
        return $this->allows($user, Permission::AppointmentsView)
            || $this->allows($user, Permission::AppointmentsCreate)
            || $this->allows($user, Permission::AppointmentsUpdate)
            || $this->allows($user, Permission::AvailabilityManage);
    }

    /**
     * Reports have no model, so an unsaved Appointment carries the target membership for `reports.view.own`.
     */
    public function viewReports(User $user, ?Membership $professional = null): bool
    {
        if ($professional === null) {
            return $this->allows($user, Permission::ReportsView);
        }

        return $this->allows($user, Permission::ReportsView, (new Appointment)->forceFill([
            'organization_id' => $professional->organization_id,
            'membership_id' => $professional->id,
        ]));
    }

    /**
     * The setup checklist walks through inviting and assigning professionals, so it goes to whoever manages the team.
     */
    public function viewSetup(User $user): bool
    {
        return $this->allows($user, Permission::MembershipsManage);
    }

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
