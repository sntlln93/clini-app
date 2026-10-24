<?php

declare(strict_types=1);

namespace App\Actions\ClinicalAccess;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\ClinicalAccess\ClinicalAccessTrailData;
use App\Exceptions\ClinicalAccess\ClinicalAccessReasonRequiredException;
use App\Models\ClinicalAccessLog;
use App\Support\ClinicalAccess;
use Illuminate\Database\Eloquent\Builder;

/**
 * A patient's access trail, newest first, as part of the history it records (#325, ADR 0022): it opens to whoever
 * reads the history, under the same reason, and holds what that reader may see (`ClinicalAccessLog::visibleTo`).
 * Reading it leaves no row: it shows nothing of the history, and each arrival at the page that shows it asks for the
 * notes again, which logs that read.
 *
 * @implements Action<ClinicalAccessTrailData>
 */
class ReadClinicalAccessTrailAction implements Action
{
    /**
     * @param  ClinicalAccessTrailData  $dto
     * @return Builder<ClinicalAccessLog>
     */
    public function handle(Data $dto): Builder
    {
        if (ClinicalAccess::requiresReason($dto->organizationId, $dto->membershipId, $dto->patientId)) {
            throw new ClinicalAccessReasonRequiredException($dto->patientId);
        }

        return ClinicalAccessLog::query()
            ->visibleTo($dto->organizationId, $dto->membershipId)
            ->where('patient_id', $dto->patientId)
            ->with(ClinicalAccessLog::TRAIL_RELATIONS)
            ->orderByDesc('created_at')
            ->orderByDesc('id');
    }
}
