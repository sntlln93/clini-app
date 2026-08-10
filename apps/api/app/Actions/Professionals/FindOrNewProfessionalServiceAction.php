<?php

declare(strict_types=1);

namespace App\Actions\Professionals;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Professionals\ProfessionalServiceAssignmentData;
use App\Models\ProfessionalService;

/**
 * @implements Action<ProfessionalServiceAssignmentData>
 */
class FindOrNewProfessionalServiceAction implements Action
{
    /**
     * @param  ProfessionalServiceAssignmentData  $dto
     */
    public function handle(Data $dto): ProfessionalService
    {
        return ProfessionalService::query()
            ->where('membership_id', $dto->membershipId)
            ->where('service_id', $dto->serviceId)
            ->first() ?? new ProfessionalService([
                'organization_id' => $dto->organizationId,
                'membership_id' => $dto->membershipId,
            ]);
    }
}
