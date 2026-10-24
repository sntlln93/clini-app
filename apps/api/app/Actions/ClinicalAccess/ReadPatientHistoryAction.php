<?php

declare(strict_types=1);

namespace App\Actions\ClinicalAccess;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\ClinicalAccess\ClinicalAccessEntryData;
use App\Data\ClinicalAccess\PatientHistoryReadData;
use App\Exceptions\ClinicalAccess\ClinicalAccessReasonRequiredException;
use App\Models\ClinicalAccessLog;
use App\Support\ClinicalAccess;

/**
 * Runs before a read of the clinical history is answered, once its policy allowed it, and logs it (#325, ADR 0022).
 * The patient's whole history takes a reason without an appointment near today; what the reader wrote on one
 * appointment of theirs never does, since it is only their own.
 *
 * @implements Action<PatientHistoryReadData>
 */
class ReadPatientHistoryAction implements Action
{
    public function __construct(
        private readonly RecordClinicalAccessAction $record,
    ) {}

    /**
     * @param  PatientHistoryReadData  $dto
     */
    public function handle(Data $dto): ClinicalAccessLog
    {
        if ($dto->appointmentId === null
            && ClinicalAccess::requiresReason($dto->organizationId, $dto->membershipId, $dto->patientId)) {
            throw new ClinicalAccessReasonRequiredException($dto->patientId);
        }

        return $this->record->handle(new ClinicalAccessEntryData(
            organizationId: $dto->organizationId,
            membershipId: $dto->membershipId,
            patientId: $dto->patientId,
            action: $dto->action,
            appointmentId: $dto->appointmentId,
        ));
    }
}
