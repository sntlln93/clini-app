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
 * The patient's background (blood type, allergies, antecedents, #361) follows the indicated medication (see
 * PrescriptionPolicy): whoever reads the patient's history reads every author's, an entry is recorded on one's own
 * appointment, and only its author amends or withdraws it. A new blood type is a new record, so it takes `create`.
 */
class MedicalHistoryEntryPolicy
{
    use AuthorsClinicalRecords;

    public function viewAnyForPatient(User $user, Patient $patient): bool
    {
        return ClinicalAccess::attends($user, $patient);
    }

    public function create(User $user, Appointment $appointment): bool
    {
        return $this->isAppointmentOwner($user, $appointment);
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
