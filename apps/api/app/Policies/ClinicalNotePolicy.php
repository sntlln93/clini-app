<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Appointment;
use App\Models\ClinicalNote;
use App\Models\Patient;
use App\Models\User;
use App\Support\ClinicalAccess;
use App\Support\CurrentOrganization;

/**
 * Not an OrganizationScopedPolicy: its org-wide layer would let a role read notes it didn't author.
 */
class ClinicalNotePolicy
{
    public function viewAny(User $user, Appointment $appointment): bool
    {
        return $this->isAppointmentOwner($user, $appointment);
    }

    public function viewAnyForPatient(User $user, Patient $patient): bool
    {
        return ClinicalAccess::attends($user, $patient);
    }

    /**
     * Outside an appointment (#382, ADR 0037): only who attends the patient, as a read of their history. The window or
     * an open exceptional access is the Action's (`ClinicalAccess::ensureOpenToWrite`).
     */
    public function createForPatient(User $user, Patient $patient): bool
    {
        return ClinicalAccess::attends($user, $patient);
    }

    public function create(User $user, Appointment $appointment): bool
    {
        return $this->isAppointmentOwner($user, $appointment);
    }

    public function view(User $user, ClinicalNote $clinicalNote): bool
    {
        return $this->isNoteOwner($user, $clinicalNote);
    }

    public function amend(User $user, ClinicalNote $clinicalNote): bool
    {
        return $this->isNoteOwner($user, $clinicalNote);
    }

    public function annul(User $user, ClinicalNote $clinicalNote): bool
    {
        return $this->isNoteOwner($user, $clinicalNote);
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

    private function isNoteOwner(User $user, ClinicalNote $clinicalNote): bool
    {
        $organizationId = app(CurrentOrganization::class)->get();
        $membership = $user->currentMembership();

        if ($organizationId === null || $membership === null) {
            return false;
        }

        return $clinicalNote->organization_id === $organizationId
            && $clinicalNote->membership_id === $membership->id;
    }
}
