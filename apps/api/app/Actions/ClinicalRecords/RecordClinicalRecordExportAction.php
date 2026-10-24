<?php

declare(strict_types=1);

namespace App\Actions\ClinicalRecords;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\ClinicalRecords\ClinicalRecordExportData;
use App\Exceptions\ClinicalAccess\ClinicalAccessReasonRequiredException;
use App\Models\ClinicalRecordExport;
use App\Support\ClinicalAccess;

/**
 * The only writer of `clinical_record_exports` (#326). It runs before the export is built, so an export that fails
 * halfway is still on record. A patient's export holds their whole history, so without an appointment near today it
 * takes the same reason as reading it (#325, ADR 0022); every attended patient at once can't take one per patient.
 *
 * @implements Action<ClinicalRecordExportData>
 */
class RecordClinicalRecordExportAction implements Action
{
    /**
     * @param  ClinicalRecordExportData  $dto
     */
    public function handle(Data $dto): ClinicalRecordExport
    {
        if ($dto->patientId !== null
            && ClinicalAccess::requiresReason($dto->organizationId, $dto->membershipId, $dto->patientId)) {
            throw new ClinicalAccessReasonRequiredException($dto->patientId);
        }

        return ClinicalRecordExport::query()->create([
            'organization_id' => $dto->organizationId,
            'membership_id' => $dto->membershipId,
            'patient_id' => $dto->patientId,
            'scope' => $dto->scope,
            'format' => $dto->format,
        ]);
    }
}
