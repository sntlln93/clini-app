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
     * There is no single resource to scope an index over, and allows() with
     * a null resource can never satisfy layer 3 (own-scoped) — so this only
     * checks that the acting membership has either the org-wide or the
     * own-scoped view permission. Narrowing to "own" happens in the query,
     * via Appointment::scopeVisibleTo().
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
     * There is no persisted resource yet at create time, so an unsaved
     * Appointment carrying the target membership's organization_id/
     * membership_id is passed to allows() so layer 3 (own-scoped) still
     * resolves correctly.
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
