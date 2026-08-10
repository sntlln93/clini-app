<?php

declare(strict_types=1);

namespace App\Actions\Availability;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Availability\AvailabilityExceptionData;
use App\Exceptions\Availability\AvailabilityExceptionAlreadyCoveredException;
use App\Exceptions\Availability\AvailabilityExceptionMergeRequiredException;
use App\Exceptions\Availability\AvailabilityExceptionTypeConflictException;
use App\Models\AvailabilityException;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * @implements Action<AvailabilityExceptionData>
 */
class SaveAvailabilityExceptionAction implements Action
{
    /**
     * @param  AvailabilityExceptionData  $dto
     */
    public function handle(Data $dto): AvailabilityException
    {
        return DB::transaction(function () use ($dto): AvailabilityException {
            $start = Carbon::parse($dto->startAt);
            $end = Carbon::parse($dto->endAt);

            $typeConflict = AvailabilityException::query()
                ->strictlyOverlappingOtherType($dto->organizationId, $dto->membershipId, $dto->type, $start, $end, $dto->availabilityExceptionId)
                ->orderBy('start_at')
                ->first();

            if ($typeConflict !== null) {
                throw new AvailabilityExceptionTypeConflictException(
                    membershipId: $dto->membershipId,
                    existingType: $typeConflict->type,
                );
            }

            $conflicts = AvailabilityException::query()
                ->overlappingOrAdjacentSameType($dto->organizationId, $dto->membershipId, $dto->type, $start, $end, $dto->availabilityExceptionId)
                ->orderBy('start_at')
                ->get();

            if ($conflicts->isEmpty()) {
                return $this->save($dto, $start, $end);
            }

            $covering = $conflicts->first(
                fn (AvailabilityException $conflict): bool => $conflict->start_at->lessThanOrEqualTo($start)
                    && $conflict->end_at->greaterThanOrEqualTo($end),
            );

            if ($covering !== null) {
                throw new AvailabilityExceptionAlreadyCoveredException(
                    membershipId: $dto->membershipId,
                    type: $dto->type,
                    covering: ['start' => $covering->start_at, 'end' => $covering->end_at],
                );
            }

            $unionStart = $conflicts->reduce(
                fn (Carbon $carry, AvailabilityException $conflict): Carbon => $carry->min($conflict->start_at),
                $start,
            );
            $unionEnd = $conflicts->reduce(
                fn (Carbon $carry, AvailabilityException $conflict): Carbon => $carry->max($conflict->end_at),
                $end,
            );

            if (! $dto->merge) {
                throw new AvailabilityExceptionMergeRequiredException(
                    membershipId: $dto->membershipId,
                    type: $dto->type,
                    merged: ['start' => $unionStart, 'end' => $unionEnd],
                    absorbed: array_values($conflicts->map(fn (AvailabilityException $conflict): array => [
                        'start' => $conflict->start_at,
                        'end' => $conflict->end_at,
                    ])->all()),
                );
            }

            AvailabilityException::query()
                ->withoutGlobalScope('organization')
                ->whereKey($conflicts->modelKeys())
                ->delete();

            return $this->save($dto, $unionStart, $unionEnd);
        });
    }

    private function save(AvailabilityExceptionData $dto, Carbon $startAt, Carbon $endAt): AvailabilityException
    {
        $attributes = [
            'organization_id' => $dto->organizationId,
            'membership_id' => $dto->membershipId,
            'type' => $dto->type,
            'start_at' => $startAt,
            'end_at' => $endAt,
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
