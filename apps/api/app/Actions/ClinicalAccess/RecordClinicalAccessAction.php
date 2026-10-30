<?php

declare(strict_types=1);

namespace App\Actions\ClinicalAccess;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\ClinicalAccess\ClinicalAccessEntryData;
use App\Models\ClinicalAccessLog;

/**
 * The only writer of `clinical_access_logs` (#325, ADR 0022). A write of the history calls it inside its own
 * transaction, so the record and its log row land together or not at all.
 *
 * @implements Action<ClinicalAccessEntryData>
 */
class RecordClinicalAccessAction implements Action
{
    /**
     * @param  ClinicalAccessEntryData  $dto
     */
    public function handle(Data $dto): ClinicalAccessLog
    {
        return ClinicalAccessLog::query()->create([
            'organization_id' => $dto->organizationId,
            'membership_id' => $dto->membershipId,
            'patient_id' => $dto->patientId,
            'action' => $dto->action,
            'appointment_id' => $dto->appointmentId,
            'clinical_note_id' => $dto->clinicalNoteId,
            'prescription_id' => $dto->prescriptionId,
            'vital_sign_id' => $dto->vitalSignId,
            'blood_type_record_id' => $dto->bloodTypeRecordId,
            'medical_history_entry_id' => $dto->medicalHistoryEntryId,
            'reason' => $dto->reason,
            'reason_detail' => $dto->reasonDetail,
            'clinical_record_export_id' => $dto->clinicalRecordExportId,
        ]);
    }
}
