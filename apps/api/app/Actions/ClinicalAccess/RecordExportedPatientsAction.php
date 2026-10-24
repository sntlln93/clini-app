<?php

declare(strict_types=1);

namespace App\Actions\ClinicalAccess;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\ClinicalAccess\ClinicalAccessEntryData;
use App\Data\ClinicalAccess\ExportedPatientsData;
use App\Enums\ClinicalAccessAction;
use Illuminate\Support\Facades\DB;

/**
 * An export reads each patient's whole history, so each one's access trail gets a row pointing at the export (#325,
 * ADR 0022). The export's own row (`clinical_record_exports`) stays its heading: who, which scope, which format.
 *
 * @implements Action<ExportedPatientsData>
 */
class RecordExportedPatientsAction implements Action
{
    public function __construct(
        private readonly RecordClinicalAccessAction $record,
    ) {}

    /**
     * @param  ExportedPatientsData  $dto
     * @return int how many trails got the row
     */
    public function handle(Data $dto): int
    {
        return DB::transaction(function () use ($dto): int {
            foreach ($dto->patientIds as $patientId) {
                $this->record->handle(new ClinicalAccessEntryData(
                    organizationId: $dto->organizationId,
                    membershipId: $dto->membershipId,
                    patientId: $patientId,
                    action: ClinicalAccessAction::RecordExported,
                    clinicalRecordExportId: $dto->clinicalRecordExportId,
                ));
            }

            return count($dto->patientIds);
        });
    }
}
