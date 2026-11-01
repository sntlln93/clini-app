<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\Permission;
use App\Models\Appointment;
use App\Models\Membership;
use App\Models\User;

class AppointmentPolicy extends OrganizationScopedPolicy
{
    /**
     * allows() without a resource can't satisfy layer 3, so "own" is narrowed in Appointment::scopeVisibleTo().
     */
    public function viewAny(User $user): bool
    {
        $membership = $user->currentMembership();

        if ($membership === null) {
            return false;
        }

        $effective = $membership->permissions();

        return in_array(Permission::AppointmentsView, $effective, true)
            || in_array(Permission::AppointmentsViewOwn, $effective, true);
    }

    /**
     * An unsaved Appointment carries the target membership so layer 3 (own-scoped) can resolve.
     */
    public function create(User $user, Membership $membership): bool
    {
        return $this->allows($user, Permission::AppointmentsCreate, new Appointment([
            'organization_id' => $membership->organization_id,
            'membership_id' => $membership->id,
        ]));
    }

    public function update(User $user, Appointment $appointment): bool
    {
        return $this->allows($user, Permission::AppointmentsUpdate, $appointment);
    }
}
