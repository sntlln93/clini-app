<?php

declare(strict_types=1);

namespace App\Actions\Patients;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Patients\PatientContactListData;
use App\Data\Patients\PatientUpdateData;
use App\Models\Patient;
use Illuminate\Support\Facades\DB;

/**
 * The practice's form is the whole list of contacts (#365): what it keeps is confirmed, what it leaves out is deleted.
 *
 * @implements Action<PatientUpdateData>
 */
class UpdatePatientAction implements Action
{
    public function __construct(
        private readonly SavePatientContactsAction $saveContacts,
    ) {}

    /**
     * @param  PatientUpdateData  $dto
     */
    public function handle(Data $dto): Patient
    {
        return DB::transaction(function () use ($dto): Patient {
            $patient = Patient::query()->lockForUpdate()->findOrFail($dto->patientId);
            $patient->update($dto->attributes);

            if ($dto->contacts !== null) {
                $this->saveContacts->handle(new PatientContactListData(
                    patientId: $patient->id,
                    contacts: $dto->contacts,
                    createdBy: $dto->updatedBy,
                    replace: true,
                    needsConfirmation: false,
                ));
            }

            return $patient;
        });
    }
}
