<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Patient;
use App\Models\User;
use App\Support\ClinicalAccess;
use App\Support\CurrentOrganization;

class ClinicalRecordExportPolicy
{
    public function exportForPatient(User $user, Patient $patient): bool
    {
        return ClinicalAccess::attends($user, $patient);
    }

    /**
     * The export itself only ever holds the patients the membership attended.
     */
    public function exportAttended(User $user): bool
    {
        return app(CurrentOrganization::class)->get() !== null
            && $user->currentMembership() !== null;
    }
}
