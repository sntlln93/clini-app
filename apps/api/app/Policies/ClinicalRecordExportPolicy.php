<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Patient;
use App\Models\User;
use App\Support\CurrentOrganization;

/**
 * Who takes the clinical history out of Clini (#326, ADR 0021): only the professional who attended the patient, the
 * same relationship that lets them read the notes (`ClinicalNotePolicy::viewAnyForPatient`), never a role. The owner
 * represents the practice that holds the history but doesn't read notes today, so an organization-wide export by the
 * owner waits on the legal answer of #315.
 */
class ClinicalRecordExportPolicy
{
    public function exportForPatient(User $user, Patient $patient): bool
    {
        $organizationId = app(CurrentOrganization::class)->get();
        $membership = $user->currentMembership();

        if ($organizationId === null || $membership === null) {
            return false;
        }

        return Patient::query()
            ->whereKey($patient->id)
            ->attendedBy($organizationId, $membership->id)
            ->exists();
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
