<?php

declare(strict_types=1);

namespace App\Actions\Availability;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Availability\AvailabilitySlotData;
use App\Models\Availability;

/**
 * @implements Action<AvailabilitySlotData>
 */
class SaveAvailabilitySlotAction implements Action
{
    /**
     * @param  AvailabilitySlotData  $dto
     */
    public function handle(Data $dto): Availability
    {
        $attributes = [
            'organization_id' => $dto->organizationId,
            'membership_id' => $dto->membershipId,
            'day_of_week' => $dto->dayOfWeek,
            'start_time' => $dto->startTime,
            'end_time' => $dto->endTime,
        ];

        if ($dto->availabilityId === null) {
            return Availability::create($attributes);
        }

        $availability = Availability::query()->findOrFail($dto->availabilityId);
        $availability->update($attributes);

        return $availability;
    }
}
