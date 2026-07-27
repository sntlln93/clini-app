<?php

declare(strict_types=1);

namespace App\Actions\Availability;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Availability\AvailabilityExceptionData;
use App\Models\AvailabilityException;

/**
 * Creates a new exception when no id is given, otherwise updates the
 * existing one in place.
 *
 * @implements Action<AvailabilityExceptionData>
 */
class SaveAvailabilityExceptionAction implements Action
{
    /**
     * @param  AvailabilityExceptionData  $dto
     */
    public function handle(Data $dto): AvailabilityException
    {
        $attributes = [
            'organization_id' => $dto->organizationId,
            'membership_id' => $dto->membershipId,
            'type' => $dto->type,
            'start_at' => $dto->startAt,
            'end_at' => $dto->endAt,
            'reason' => $dto->reason,
        ];

        if ($dto->availabilityExceptionId === null) {
            return AvailabilityException::create($attributes);
        }

        $availabilityException = AvailabilityException::query()->findOrFail($dto->availabilityExceptionId);
        $availabilityException->update($attributes);

        return $availabilityException;
    }
}
