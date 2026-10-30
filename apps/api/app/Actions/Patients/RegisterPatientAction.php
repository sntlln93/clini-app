<?php

declare(strict_types=1);

namespace App\Actions\Patients;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Patients\PatientContactListData;
use App\Data\Patients\PatientRegistrationData;
use App\Exceptions\Patients\InsuranceMemberNumberTakenException;
use App\Models\Patient;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

/**
 * Global find-or-create on (document_type, document_number). The contacts given are added to the patient's, never in place
 * of them (#365): a practice's are confirmed, while an anonymous booking's (no `createdBy`) on a patient who already
 * existed wait for a practice to confirm them before a reminder goes there.
 *
 * @implements Action<PatientRegistrationData>
 */
class RegisterPatientAction implements Action
{
    public function __construct(
        private readonly SavePatientContactsAction $saveContacts,
    ) {}

    /**
     * @param  PatientRegistrationData  $dto
     */
    public function handle(Data $dto): Patient
    {
        try {
            return $this->registerOrReuse($dto);
        } catch (UniqueConstraintViolationException $exception) {
            // Validation already rejects a member number taken by another patient, so this index only fires on a concurrent claim (#290).
            if (str_contains($exception->getMessage(), 'patients_insurance_member_number_unique')) {
                throw new InsuranceMemberNumberTakenException((int) $dto->insuranceProviderId);
            }

            // Lost a race against a concurrent insert of the same document pair: the transaction above is already rolled back by Postgres, so a fresh transaction re-reads and reuses the row the winner just created. Bounded to a single retry, a second collision is not swallowed.
            return $this->reuseExisting($dto);
        }
    }

    private function registerOrReuse(PatientRegistrationData $dto): Patient
    {
        return DB::transaction(function () use ($dto): Patient {
            // Locked so that saving its contacts never races another save of them.
            $patient = Patient::withTrashed()
                ->where('document_type', $dto->documentType)
                ->where('document_number', $dto->documentNumber)
                ->lockForUpdate()
                ->first();
            $existed = $patient !== null;

            if ($patient !== null) {
                if ($patient->trashed()) {
                    $patient->restore();
                }

                $this->fillMissingPersonalFields($patient, $dto);
            } else {
                $patient = Patient::create([
                    'name' => $dto->name,
                    'document_type' => $dto->documentType,
                    'document_number' => $dto->documentNumber,
                    'sex' => $dto->sex,
                    'birth_date' => $dto->birthDate,
                    'insurance_provider_id' => $dto->insuranceProviderId,
                    'insurance_member_number' => $dto->insuranceMemberNumber,
                    'created_by' => $dto->createdBy,
                ]);
            }

            $this->addContacts($patient, $dto, $existed);
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
                ->lockForUpdate()
                ->firstOrFail();

            if ($patient->trashed()) {
                $patient->restore();
            }

            $this->fillMissingPersonalFields($patient, $dto);
            $this->addContacts($patient, $dto, existed: true);
            $patient->organizations()->syncWithoutDetaching([$dto->organizationId]);

            return $patient;
        });
    }

    private function addContacts(Patient $patient, PatientRegistrationData $dto, bool $existed): void
    {
        $this->saveContacts->handle(new PatientContactListData(
            patientId: $patient->id,
            contacts: $dto->contacts,
            createdBy: $dto->createdBy,
            replace: false,
            needsConfirmation: $existed && $dto->createdBy === null,
        ));
    }

    // Fills only the personal fields that are currently empty; name is never touched, and populated fields are never overwritten.
    private function fillMissingPersonalFields(Patient $patient, PatientRegistrationData $dto): void
    {
        $candidates = [
            'sex' => $dto->sex,
            'birth_date' => $dto->birthDate,
        ];

        foreach ($candidates as $attribute => $value) {
            if ($value === null) {
                continue;
            }

            if (blank($patient->getAttribute($attribute))) {
                $patient->setAttribute($attribute, $value);
            }
        }

        // Provider and member number travel together: a number is never attached to another provider.
        if ($dto->insuranceProviderId !== null && blank($patient->insurance_provider_id)) {
            $patient->fill([
                'insurance_provider_id' => $dto->insuranceProviderId,
                'insurance_member_number' => $dto->insuranceMemberNumber,
            ]);
        }

        if ($patient->isDirty()) {
            $patient->save();
        }
    }
}
