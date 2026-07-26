<?php

declare(strict_types=1);

namespace App\Actions\Professionals;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Professionals\UserSpecialtyAssignmentData;
use App\Models\UserSpecialty;

/**
 * Idempotent: assigning the same credential twice never duplicates or
 * errors.
 *
 * @implements Action<UserSpecialtyAssignmentData>
 */
class AssignUserSpecialtyAction implements Action
{
    /**
     * @param  UserSpecialtyAssignmentData  $dto
     */
    public function handle(Data $dto): UserSpecialty
    {
        return UserSpecialty::firstOrCreate([
            'user_id' => $dto->userId,
            'specialty_id' => $dto->specialtyId,
        ]);
    }
}
