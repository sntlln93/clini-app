<?php

declare(strict_types=1);

namespace App\Actions\Professionals;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Professionals\ProfessionalSpecialtyAssignmentData;
use App\Models\ProfessionalSpecialty;

/**
 * Persists the denormalized user_id: whether a verified license still backs the specialty is read through it (#387).
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
