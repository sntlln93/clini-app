<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Appointment;
use App\Models\MedicalHistoryEntry;
use App\Models\Patient;
use App\Models\User;
use App\Policies\Concerns\AuthorsClinicalRecords;
use App\Support\ClinicalAccess;

/**
 * A new blood type is a new record, so it takes `create`.
 */
class MedicalHistoryEntryPolicy
{
    use AuthorsClinicalRecords;

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

    /**
     * Shown above the medication form, which only the appointment's professional fills in.
     */
    public function viewCurrentAllergies(User $user, Appointment $appointment): bool
    {
        return $this->isAppointmentOwner($user, $appointment);
    }

    /**
     * Shown above the medication form outside an appointment (#382), to who may indicate it there.
     */
    public function viewCurrentAllergiesForPatient(User $user, Patient $patient): bool
    {
        return ClinicalAccess::attends($user, $patient);
    }

    public function amend(User $user, MedicalHistoryEntry $entry): bool
    {
        return $this->actsAs($user, $entry->organization_id, $entry->membership_id);
    }

    public function withdraw(User $user, MedicalHistoryEntry $entry): bool
    {
        return $this->actsAs($user, $entry->organization_id, $entry->membership_id);
    }
}
