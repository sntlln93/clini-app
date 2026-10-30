<?php

declare(strict_types=1);

namespace App\Actions\Prescriptions;

use App\Actions\ClinicalAccess\RecordClinicalAccessAction;
use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\ClinicalAccess\ClinicalAccessEntryData;
use App\Data\Prescriptions\AllergyWarningOverrideData;
use App\Enums\ClinicalAccessAction;
use App\Models\ClinicalAccessLog;
use App\Models\PrescriptionAllergyWarning;

/**
 * «Indicar igual» (#362, ADR 0030): the access log gets a row of its own, and the version keeps the allergies its
 * professional was warned about, pointing at that row. Runs inside the write's own transaction, like every row of the
 * log (ADR 0022).
 *
 * @implements Action<AllergyWarningOverrideData>
 */
class RecordAllergyWarningOverrideAction implements Action
{
    public function __construct(
        private readonly RecordClinicalAccessAction $record,
    ) {}

    /**
     * @param  AllergyWarningOverrideData  $dto
     * @return ClinicalAccessLog|null the confirmation's row, or none when the medication matched no allergy
     */
    public function handle(Data $dto): ?ClinicalAccessLog
    {
        if ($dto->matches === []) {
            return null;
        }

        $log = $this->record->handle(new ClinicalAccessEntryData(
            organizationId: $dto->organizationId,
            membershipId: $dto->membershipId,
            patientId: $dto->patientId,
            action: ClinicalAccessAction::AllergyWarningOverridden,
            appointmentId: $dto->appointmentId,
            prescriptionId: $dto->prescriptionId,
        ));

        foreach ($dto->matches as $match) {
            PrescriptionAllergyWarning::query()->create([
                'prescription_version_id' => $dto->prescriptionVersionId,
                'clinical_access_log_id' => $log->id,
                'medical_history_entry_id' => $match->entryId,
                'medical_history_entry_version_id' => $match->entryVersionId,
                'detail_shown' => $match->detailShown,
            ]);
        }

        return $log;
    }
}
