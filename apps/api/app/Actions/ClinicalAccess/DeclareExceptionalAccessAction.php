<?php

declare(strict_types=1);

namespace App\Actions\ClinicalAccess;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\ClinicalAccess\ClinicalAccessEntryData;
use App\Data\ClinicalAccess\ExceptionalAccessDeclarationData;
use App\Enums\ClinicalAccessAction;
use App\Exceptions\ClinicalAccess\ClinicalAccessReasonNotRequiredException;
use App\Models\ClinicalAccessLog;
use App\Support\ClinicalAccess;

/**
 * Opens a patient's history to a professional without an appointment near today, for
 * `ClinicalAccess::EXCEPTIONAL_ACCESS_MINUTES` (#325, ADR 0022). With an appointment near today there is nothing to
 * open, so the owner's list of exceptional accesses only ever holds real ones.
 *
 * @implements Action<ExceptionalAccessDeclarationData>
 */
class DeclareExceptionalAccessAction implements Action
{
    public function __construct(
        private readonly RecordClinicalAccessAction $record,
    ) {}

    /**
     * @param  ExceptionalAccessDeclarationData  $dto
     */
    public function handle(Data $dto): ClinicalAccessLog
    {
        if (ClinicalAccess::hasAppointmentNearNow($dto->organizationId, $dto->membershipId, $dto->patientId)) {
            throw new ClinicalAccessReasonNotRequiredException($dto->patientId);
        }

        return $this->record->handle(new ClinicalAccessEntryData(
            organizationId: $dto->organizationId,
            membershipId: $dto->membershipId,
            patientId: $dto->patientId,
            action: ClinicalAccessAction::ExceptionalAccess,
            reason: $dto->reason,
            reasonDetail: $dto->reasonDetail,
        ));
    }
}
