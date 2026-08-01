<?php

declare(strict_types=1);

namespace App\Actions\Booking;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Booking\PublishedDayIntervalsData;
use App\Data\Booking\SlotAvailabilityCheckData;
use App\Exceptions\Booking\SlotNotAvailableException;
use App\Models\Organization;

/**
 * Guards the online booking flow's own pre-check: the requested start time
 * must fall within the professional's *published* schedule for that day —
 * availabilities plus `extra` exceptions, minus `blocked` exceptions —
 * without excluding time already taken by busy appointments. This action
 * must stay independent from BookAppointmentAction's overlap check: it only
 * rejects times outside the published schedule, never times that are merely
 * taken (that 409, appointments.slot_taken, is BookAppointmentAction's alone).
 *
 * @implements Action<SlotAvailabilityCheckData>
 */
class AssertSlotWithinPublishedScheduleAction implements Action
{
    public function __construct(
        private readonly ComputePublishedDayIntervalsAction $computePublishedDayIntervals,
    ) {}

    /**
     * @param  SlotAvailabilityCheckData  $dto
     *
     * Returns null rather than declaring `void`: the Action contract
     * declares `handle(Data $dto): mixed`, and PHP rejects `void` as a
     * non-covariant override of `mixed` (a class-load-time Fatal, not one
     * PHPStan catches) — no Action in this codebase declares `void` for
     * that reason.
     */
    public function handle(Data $dto): mixed
    {
        $organization = Organization::query()->findOrFail($dto->organizationId);
        $timezone = $organization->timezone;

        $day = $dto->startAt->setTimezone($timezone)->startOfDay();
        $slotEnd = $dto->startAt->addMinutes($dto->durationMinutes);

        $intervals = $this->computePublishedDayIntervals->handle(new PublishedDayIntervalsData(
            membershipId: $dto->membershipId,
            day: $day,
        ));

        foreach ($intervals as $interval) {
            if ($dto->startAt->gte($interval['start']) && $slotEnd->lte($interval['end'])) {
                return null;
            }
        }

        throw new SlotNotAvailableException($dto->membershipId, $dto->startAt);
    }
}
