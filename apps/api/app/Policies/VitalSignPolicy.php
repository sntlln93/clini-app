<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\User;
use App\Models\VitalSign;
use App\Policies\Concerns\AuthorsClinicalRecords;
use App\Support\ClinicalAccess;

class VitalSignPolicy
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

    public function amend(User $user, VitalSign $vitalSign): bool
    {
        return $this->actsAs($user, $vitalSign->organization_id, $vitalSign->membership_id);
    }

    public function annul(User $user, VitalSign $vitalSign): bool
    {
        return $this->actsAs($user, $vitalSign->organization_id, $vitalSign->membership_id);
    }
}
