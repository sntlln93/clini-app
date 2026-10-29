<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\User;
use App\Support\ClinicalAccess;
use App\Support\CurrentOrganization;

/**
 * Prescriptions follow the clinical notes access model (issue #31, see
 * ClinicalNotePolicy), never a role preset: the appointment-scoped listing,
 * creating, amending and annulling are decided by membership authorship
 * within the active organization.
 *
 * The patient-scoped listing opens to the same professionals as the
 * patient's notes (`ClinicalAccess::attends`, #325) and, like them, returns
 * every author's prescriptions: they are part of one clinical history (#359).
 * Without an appointment near today, reading it also takes a reason (ADR
 * 0022). A record is never edited or deleted (#323, ADR 0019): only its author
 * amends or annuls it instead (#344).
 */
class PrescriptionPolicy
{
    public function viewAny(User $user, Appointment $appointment): bool
    {
        return $this->isAppointmentOwner($user, $appointment);
    }

    public function viewAnyForPatient(User $user, Patient $patient): bool
    {
        return ClinicalAccess::attends($user, $patient);
    }

    public function create(User $user, Appointment $appointment): bool
    {
        return $this->isAppointmentOwner($user, $appointment);
    }

    public function amend(User $user, Prescription $prescription): bool
    {
        return $this->isPrescriptionOwner($user, $prescription);
    }

    public function annul(User $user, Prescription $prescription): bool
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
