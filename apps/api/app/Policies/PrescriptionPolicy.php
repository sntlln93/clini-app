<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Appointment;
use App\Models\Prescription;
use App\Models\User;
use App\Support\CurrentOrganization;

/**
 * Prescriptions follow the clinical notes access model (issue #31, see
 * ClinicalNotePolicy): every ability is decided exclusively by membership
 * authorship within the active organization, never by a role preset —
 * Owner/Admin/Staff cannot read a prescription they didn't issue.
 *
 * Unlike clinical notes, the patient-scoped listing is NOT widened to other
 * professionals: it only ever returns the acting membership's own
 * prescriptions, so `viewAnyForPatient` just requires an active membership.
 */
class PrescriptionPolicy
{
    public function viewAny(User $user, Appointment $appointment): bool
    {
        return $this->isAppointmentOwner($user, $appointment);
    }

    public function viewAnyForPatient(User $user): bool
    {
        return app(CurrentOrganization::class)->get() !== null
            && $user->currentMembership() !== null;
    }

    public function create(User $user, Appointment $appointment): bool
    {
        return $this->isAppointmentOwner($user, $appointment);
    }

    public function view(User $user, Prescription $prescription): bool
    {
        return $this->isPrescriptionOwner($user, $prescription);
    }

    public function update(User $user, Prescription $prescription): bool
    {
        return $this->isPrescriptionOwner($user, $prescription);
    }

    private function isAppointmentOwner(User $user, Appointment $appointment): bool
    {
        $organizationId = app(CurrentOrganization::class)->get();
        $membership = $user->currentMembership();

        if ($organizationId === null || $membership === null) {
            return false;
        }

        return $appointment->organization_id === $organizationId
            && $appointment->membership_id === $membership->id;
    }

    private function isPrescriptionOwner(User $user, Prescription $prescription): bool
    {
        $organizationId = app(CurrentOrganization::class)->get();
        $membership = $user->currentMembership();

        if ($organizationId === null || $membership === null) {
            return false;
        }

        return $prescription->organization_id === $organizationId
            && $prescription->membership_id === $membership->id;
    }
}
