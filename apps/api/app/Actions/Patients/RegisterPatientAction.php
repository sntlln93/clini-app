<?php

declare(strict_types=1);

namespace App\Actions\Patients;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Patients\PatientRegistrationData;
use App\Models\Patient;
use Illuminate\Support\Facades\DB;

/**
 * Global find-or-create on (document_type, document_number): reuses an
 * existing patient rather than ever creating a second one for the same
 * document pair, and links it to the acting organization.
 *
 * @implements Action<PatientRegistrationData>
 */
class RegisterPatientAction implements Action
{
    /**
     * @param  PatientRegistrationData  $dto
     */
    public function handle(Data $dto): Patient
    {
        return DB::transaction(function () use ($dto): Patient {
            $patient = Patient::withTrashed()
                ->where('document_type', $dto->documentType)
                ->where('document_number', $dto->documentNumber)
                ->first();

            if ($patient !== null) {
                if ($patient->trashed()) {
                    $patient->restore();
                }

                $this->fillMissingContactFields($patient, $dto);
            } else {
                $patient = Patient::create([
                    'name' => $dto->name,
                    'document_type' => $dto->documentType,
                    'document_number' => $dto->documentNumber,
                    'email' => $dto->email,
                    'phone' => $dto->phone,
                    'sex' => $dto->sex,
                    'birth_date' => $dto->birthDate,
                    'insurance_provider_id' => $dto->insuranceProviderId,
                    'created_by' => $dto->createdBy,
                ]);
            }

            $patient->organizations()->syncWithoutDetaching([$dto->organizationId]);

            return $patient;
        });
    }

    /**
     * Fills only the contact fields that are currently empty on the
     * existing patient. name is never touched here, and populated fields
     * are never overwritten.
     */
    private function fillMissingContactFields(Patient $patient, PatientRegistrationData $dto): void
    {
        $candidates = [
            'email' => $dto->email,
            'phone' => $dto->phone,
            'sex' => $dto->sex,
            'birth_date' => $dto->birthDate,
            'insurance_provider_id' => $dto->insuranceProviderId,
        ];

        foreach ($candidates as $attribute => $value) {
            if ($value === null) {
                continue;
            }

            if (blank($patient->getAttribute($attribute))) {
                $patient->setAttribute($attribute, $value);
            }
        }

        if ($patient->isDirty()) {
            $patient->save();
        }
    }
}
