<?php

declare(strict_types=1);

namespace App\Actions\Booking;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Booking\PublishedScheduleData;
use App\Data\Booking\SlotAvailabilityCheckData;
use App\Exceptions\Booking\SlotNotAvailableException;
use App\Models\Organization;

/**
 * Guards the online booking pre-check: the requested start time must fall
 * within the professional's *published* schedule, independently from
 * BookAppointmentAction's overlap check — this only rejects times outside
 * the published schedule, never times that are merely taken (that 409,
 * appointments.slot_taken, is BookAppointmentAction's alone).
 *
 * @implements Action<SlotAvailabilityCheckData>
 */
class AssertSlotWithinPublishedScheduleAction implements Action
{
    public function __construct(
        private readonly ComputePublishedScheduleAction $computePublishedSchedule,
    ) {}

    /**
     * @param  SlotAvailabilityCheckData  $dto
     *
     * Returns null, not void: the Action contract declares
     * `handle(Data $dto): mixed`, and PHP rejects `void` as a
     * non-covariant override of `mixed` (a class-load-time Fatal) — no
     * Action in this codebase declares `void` for that reason.
     */
    public function handle(Data $dto): mixed
    {
        $organization = Organization::query()->findOrFail($dto->organizationId);
        $timezone = $organization->timezone;

        $date = $dto->startAt->setTimezone($timezone)->toDateString();
        $slotEnd = $dto->startAt->addMinutes($dto->durationMinutes);

        $intervals = $this->computePublishedSchedule->handle(new PublishedScheduleData(
            organizationId: $organization->id,
            membershipIds: [$dto->membershipId],
            fromDate: $date,
            toDate: $date,
        ))[$dto->membershipId][$date];

        foreach ($intervals as $interval) {
            if ($dto->startAt->gte($interval['start']) && $slotEnd->lte($interval['end'])) {
                return null;
            }
        }

        throw new SlotNotAvailableException($dto->membershipId, $dto->startAt);
    }
}
