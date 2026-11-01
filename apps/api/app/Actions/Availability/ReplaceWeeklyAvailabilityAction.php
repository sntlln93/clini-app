<?php

declare(strict_types=1);

namespace App\Actions\Availability;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Availability\AvailabilitySlotData;
use App\Data\Availability\WeeklyAvailabilityData;
use App\Models\Availability;
use App\Models\Membership;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Replaces a membership's whole weekly schedule atomically. The membership
 * row is locked first so two concurrent saves of the same week serialize
 * instead of interleaving their delete and insert.
 *
 * @implements Action<WeeklyAvailabilityData>
 */
class ReplaceWeeklyAvailabilityAction implements Action
{
    /**
     * @param  WeeklyAvailabilityData  $dto
     * @return Collection<int, Availability>
     */
    public function handle(Data $dto): Collection
    {
        return DB::transaction(function () use ($dto): Collection {
            Membership::query()->whereKey($dto->membershipId)->lockForUpdate()->firstOrFail();

            Availability::query()->where('membership_id', $dto->membershipId)->delete();

            foreach ($dto->slots as $slot) {
                $this->create($dto, $slot);
            }

            return Availability::query()
                ->where('membership_id', $dto->membershipId)
                ->orderBy('day_of_week')
                ->orderBy('start_time')
                ->get();
        });
    }

    private function create(WeeklyAvailabilityData $dto, AvailabilitySlotData $slot): void
    {
        Availability::create([
            'organization_id' => $dto->organizationId,
            'membership_id' => $dto->membershipId,
            'day_of_week' => $slot->dayOfWeek,
            'start_time' => $slot->startTime,
            'end_time' => $slot->endTime,
        ]);
    }
}
