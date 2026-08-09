<?php

declare(strict_types=1);

namespace App\Actions\Professionals;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Professionals\ProfessionalSpecialtyAssignmentData;
use App\Models\ProfessionalSpecialty;

/**
 * Persists the denormalized user_id the composite FK to user_specialties depends on.
 *
 * @implements Action<ProfessionalSpecialtyAssignmentData>
 */
class AssignProfessionalSpecialtyAction implements Action
{
    /**
     * @param  ProfessionalSpecialtyAssignmentData  $dto
     */
    public function handle(Data $dto): ProfessionalSpecialty
    {
        return ProfessionalSpecialty::firstOrCreate(
            [
                'membership_id' => $dto->membershipId,
                'specialty_id' => $dto->specialtyId,
            ],
            [
                'organization_id' => $dto->organizationId,
                'user_id' => $dto->userId,
            ],
        );
    }
}
