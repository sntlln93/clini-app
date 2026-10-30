<?php

declare(strict_types=1);

namespace App\Actions\Patients;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Patients\PatientLookupData;
use App\Exceptions\Patients\PatientNotFoundException;
use App\Models\Patient;
use App\Models\PatientLookup;

/**
 * Finds a patient of any practice by their exact document, so the form can be prefilled with the personal data the
 * platform shares (#365). Every search leaves a `patient_lookups` row, whether it found someone or not, and a miss
 * records nothing about the document searched.
 *
 * @implements Action<PatientLookupData>
 */
class LookUpPatientAction implements Action
{
    /**
     * @param  PatientLookupData  $dto
     */
    public function handle(Data $dto): Patient
    {
        $patient = Patient::query()
            ->where('document_type', $dto->documentType)
            ->where('document_number', $dto->documentNumber)
            ->first();

        PatientLookup::create([
            'organization_id' => $dto->organizationId,
            'membership_id' => $dto->membershipId,
            'patient_id' => $patient?->id,
        ]);

        if ($patient === null) {
            throw new PatientNotFoundException;
        }

        return $patient->load(['insuranceProvider', 'contacts']);
    }
}
