<?php

declare(strict_types=1);

namespace App\Actions\ClinicalRecords;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\ClinicalRecords\ClinicalRecordExportData;
use App\Models\ClinicalRecordExport;

/**
 * The only writer of `clinical_record_exports` (#326). It runs before the export is built, so an export that fails
 * halfway is still on record.
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
        return ClinicalRecordExport::query()->create([
            'organization_id' => $dto->organizationId,
            'membership_id' => $dto->membershipId,
            'patient_id' => $dto->patientId,
            'scope' => $dto->scope,
            'format' => $dto->format,
        ]);
    }
}
