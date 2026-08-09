<?php

declare(strict_types=1);

namespace App\Actions\Patients;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Patients\PatientRegistrationData;
use App\Models\Patient;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

/**
 * Global find-or-create on (document_type, document_number).
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
        try {
            return $this->registerOrReuse($dto);
        } catch (UniqueConstraintViolationException) {
            // Lost a race against a concurrent insert of the same document pair: the transaction above is already rolled back by Postgres, so a fresh transaction re-reads and reuses the row the winner just created. Bounded to a single retry, a second collision is not swallowed.
            return $this->reuseExisting($dto);
        }
    }

    private function registerOrReuse(PatientRegistrationData $dto): Patient
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

    // Continues with the same fill-only-empty and pivot-link behavior as the normal "found" path.
    private function reuseExisting(PatientRegistrationData $dto): Patient
    {
        return DB::transaction(function () use ($dto): Patient {
            $patient = Patient::withTrashed()
                ->where('document_type', $dto->documentType)
                ->where('document_number', $dto->documentNumber)
                ->firstOrFail();

            if ($patient->trashed()) {
                $patient->restore();
            }

            $this->fillMissingContactFields($patient, $dto);
            $patient->organizations()->syncWithoutDetaching([$dto->organizationId]);

            return $patient;
        });
    }

    // Fills only the contact fields that are currently empty; name is never touched, and populated fields are never overwritten.
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
