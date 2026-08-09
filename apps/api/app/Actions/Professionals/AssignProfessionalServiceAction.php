<?php

declare(strict_types=1);

namespace App\Actions\Professionals;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Professionals\ProfessionalServiceAssignmentData;
use App\Models\ProfessionalService;

/**
 * currency is never accepted here — it stays whatever the column default (ARS) set at creation.
 *
 * @implements Action<ProfessionalServiceAssignmentData>
 */
class AssignProfessionalServiceAction implements Action
{
    /**
     * @param  ProfessionalServiceAssignmentData  $dto
     */
    public function handle(Data $dto): ProfessionalService
    {
        return ProfessionalService::updateOrCreate(
            [
                'membership_id' => $dto->membershipId,
                'service_id' => $dto->serviceId,
            ],
            [
                'organization_id' => $dto->organizationId,
                'duration_minutes' => $dto->durationMinutes,
                'price_cents' => $dto->priceCents,
                'active' => $dto->active,
            ],
        );
    }
}
