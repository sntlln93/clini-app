<?php

declare(strict_types=1);

namespace App\Actions\Availability;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Availability\AvailabilitySlotData;
use App\Exceptions\Availability\AvailabilitySlotAlreadyCoveredException;
use App\Exceptions\Availability\AvailabilitySlotMergeRequiredException;
use App\Models\Availability;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

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
        return DB::transaction(function () use ($dto): Availability {
            $start = $this->normalize($dto->startTime);
            $end = $this->normalize($dto->endTime);

            $conflicts = Availability::query()
                ->overlappingOrAdjacent($dto->membershipId, $dto->dayOfWeek, $start, $end, $dto->availabilityId)
                ->orderBy('start_time')
                ->get();

            if ($conflicts->isEmpty()) {
                return $this->save($dto, $start, $end);
            }

            $covering = $conflicts->first(
                fn (Availability $conflict): bool => $this->normalize($conflict->start_time) <= $start
                    && $this->normalize($conflict->end_time) >= $end,
            );

            if ($covering !== null) {
                throw new AvailabilitySlotAlreadyCoveredException(
                    membershipId: $dto->membershipId,
                    dayOfWeek: $dto->dayOfWeek,
                    covering: [
                        'start' => $this->toHi($covering->start_time),
                        'end' => $this->toHi($covering->end_time),
                    ],
                );
            }

            $unionStart = $conflicts->reduce(
                fn (string $carry, Availability $conflict): string => min($carry, $this->normalize($conflict->start_time)),
                $start,
            );
            $unionEnd = $conflicts->reduce(
                fn (string $carry, Availability $conflict): string => max($carry, $this->normalize($conflict->end_time)),
                $end,
            );

            if (! $dto->merge) {
                throw new AvailabilitySlotMergeRequiredException(
                    membershipId: $dto->membershipId,
                    dayOfWeek: $dto->dayOfWeek,
                    merged: ['start' => $this->toHi($unionStart), 'end' => $this->toHi($unionEnd)],
                    absorbed: array_values($conflicts->map(fn (Availability $conflict): array => [
                        'start' => $this->toHi($conflict->start_time),
                        'end' => $this->toHi($conflict->end_time),
                    ])->all()),
                );
            }

            Availability::query()->whereKey($conflicts->modelKeys())->delete();

            return $this->save($dto, $unionStart, $unionEnd);
        });
    }

    private function save(AvailabilitySlotData $dto, string $startTime, string $endTime): Availability
    {
        $attributes = [
            'organization_id' => $dto->organizationId,
            'membership_id' => $dto->membershipId,
            'day_of_week' => $dto->dayOfWeek,
            'start_time' => $startTime,
            'end_time' => $endTime,
        ];

        if ($dto->availabilityId === null) {
            return Availability::create($attributes);
        }

        $availability = Availability::query()->findOrFail($dto->availabilityId);
        $availability->update($attributes);

        return $availability;
    }

    private function normalize(string $time): string
    {
        return Carbon::parse($time)->format('H:i:s');
    }

    private function toHi(string $time): string
    {
        return Carbon::parse($time)->format('H:i');
    }
}
