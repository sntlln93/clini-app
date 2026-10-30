<?php

declare(strict_types=1);

namespace App\Actions\MedicalHistory;

use App\Actions\ClinicalAccess\RecordClinicalAccessAction;
use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\ClinicalAccess\ClinicalAccessEntryData;
use App\Data\MedicalHistory\BloodTypeRecordData;
use App\Enums\ClinicalAccessAction;
use App\Exceptions\MedicalHistory\BloodTypeUnchangedException;
use App\Models\BloodTypeRecord;
use App\Models\Patient;
use Illuminate\Support\Facades\DB;

/**
 * Records the patient's blood type, or changes it (#361, ADR 0027): the new record becomes the current value and the
 * earlier ones stay with their authors. Repeating the current value is refused, so the history only holds changes.
 * The patient's row is locked so two changes at once can't both pass that check.
 *
 * @implements Action<BloodTypeRecordData>
 */
class RecordBloodTypeAction implements Action
{
    public function __construct(
        private readonly RecordClinicalAccessAction $record,
    ) {}

    /**
     * @param  BloodTypeRecordData  $dto
     */
    public function handle(Data $dto): BloodTypeRecord
    {
        return DB::transaction(function () use ($dto): BloodTypeRecord {
            Patient::query()->withTrashed()->whereKey($dto->patientId)->lockForUpdate()->firstOrFail();

            $current = BloodTypeRecord::query()
                ->where('organization_id', $dto->organizationId)
                ->where('patient_id', $dto->patientId)
                ->latest('created_at')
                ->latest('id')
                ->first();

            if ($current?->blood_type === $dto->bloodType) {
                throw new BloodTypeUnchangedException($dto->patientId);
            }

            $record = BloodTypeRecord::create([
                'organization_id' => $dto->organizationId,
                'appointment_id' => $dto->appointmentId,
                'patient_id' => $dto->patientId,
                'membership_id' => $dto->membershipId,
                'blood_type' => $dto->bloodType,
                'reason' => $dto->reason,
            ]);

            $this->record->handle(new ClinicalAccessEntryData(
                organizationId: $record->organization_id,
                membershipId: $dto->membershipId,
                patientId: $record->patient_id,
                action: ClinicalAccessAction::BloodTypeRecorded,
                appointmentId: $record->appointment_id,
                bloodTypeRecordId: $record->id,
            ));

            return $record;
        });
    }
}
