<?php

declare(strict_types=1);

namespace App\Actions\Professionals;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Professionals\ProfessionalServiceLookupData;
use App\Models\ProfessionalService;

/**
 * @implements Action<ProfessionalServiceLookupData>
 */
class FindOrNewProfessionalServiceAction implements Action
{
    /**
     * @param  ProfessionalServiceLookupData  $dto
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
