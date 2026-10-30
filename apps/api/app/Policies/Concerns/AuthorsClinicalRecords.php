<?php

declare(strict_types=1);

namespace App\Policies\Concerns;

use App\Models\Appointment;
use App\Models\User;
use App\Support\CurrentOrganization;

/**
 * Who writes a clinical record (#361): it is recorded on one's own appointment, and only its author amends or
 * withdraws it, within the active organization — never by a role preset, as with notes and indicated medication.
 */
trait AuthorsClinicalRecords
{
    private function isAppointmentOwner(User $user, Appointment $appointment): bool
    {
        return $this->actsAs($user, $appointment->organization_id, $appointment->membership_id);
    }

    private function actsAs(User $user, int $organizationId, int $membershipId): bool
    {
        $currentOrganizationId = app(CurrentOrganization::class)->get();
        $membership = $user->currentMembership();

        if ($currentOrganizationId === null || $membership === null) {
            return false;
        }

        return $organizationId === $currentOrganizationId && $membershipId === $membership->id;
    }
}
