<?php

declare(strict_types=1);

namespace App\Actions\Booking;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Booking\AvailableSlotData;
use App\Data\Booking\PublishedDayIntervalsData;
use App\Data\Booking\SlotSearchData;
use App\Enums\AppointmentStatus;
use App\Models\Appointment;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\ProfessionalService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;

/**
 * Computes the grid of bookable slots for a membership+service pair over a
 * date range: the professional's *published* schedule per day (delegated to
 * ComputePublishedDayIntervalsAction — weekly `availabilities` plus `extra`
 * exceptions, minus `blocked` exceptions), minus any overlapping active
 * appointment of the same physical professional (across organizations, same
 * rule as BookAppointmentAction). Holidays are deliberately never subtracted
 * (owner decision, see the handoff). Everything runs in the organization's
 * own timezone (`organizations.timezone`); the app itself runs in UTC.
 *
 * @implements Action<SlotSearchData>
 */
class ListAvailableSlotsAction implements Action
{
    public const int BOOKING_WINDOW_DAYS = 60;

    public function __construct(
        private readonly ComputePublishedDayIntervalsAction $computePublishedDayIntervals,
    ) {}

    /**
     * @param  SlotSearchData  $dto
     * @return array<int, AvailableSlotData>
     */
    public function handle(Data $dto): array
    {
        $membership = Membership::query()->findOrFail($dto->membershipId);
        $organization = Organization::query()->findOrFail($dto->organizationId);
        $timezone = $organization->timezone;

        $professionalService = ProfessionalService::query()
            ->where('membership_id', $dto->membershipId)
            ->where('service_id', $dto->serviceId)
            ->where('active', true)
            ->first();

        if ($professionalService === null) {
            return [];
        }

        $durationMinutes = $professionalService->duration_minutes;

        // Calendar-day boundaries in the organization's own timezone — not
        // $dto->from/$dto->to directly, which are date-only instants at UTC
        // midnight and would miss same-day exceptions/appointments that
        // fall later in the local day.
        $cursor = CarbonImmutable::parse($dto->from->toDateString(), $timezone)->startOfDay();
        $lastDay = CarbonImmutable::parse($dto->to->toDateString(), $timezone)->startOfDay();
        $rangeEnd = $lastDay->addDay();

        $userId = $membership->user_id;
        $membershipIds = Membership::withoutGlobalScope('organization')
            ->where('user_id', $userId)
            ->pluck('id');

        $busyAppointments = Appointment::withoutGlobalScope('organization')
            ->whereIn('membership_id', $membershipIds)
            ->whereNotIn('status', [AppointmentStatus::Cancelled, AppointmentStatus::Rescheduled])
            ->where('start_at', '<', $rangeEnd)
            ->where('end_at', '>', $cursor)
            ->get(['start_at', 'end_at']);

        $now = CarbonImmutable::now($timezone);
        $slots = [];

        while ($cursor->lte($lastDay)) {
            $dayIntervals = $this->computePublishedDayIntervals->handle(new PublishedDayIntervalsData(
                membershipId: $dto->membershipId,
                day: $cursor,
            ));

            foreach ($dayIntervals as $interval) {
                $slots = [
                    ...$slots,
                    ...$this->slotsWithinInterval($interval, $durationMinutes, $now, $busyAppointments),
                ];
            }

            $cursor = $cursor->addDay();
        }

        return $slots;
    }

    /**
     * @param  array{start: CarbonImmutable, end: CarbonImmutable}  $interval
     * @param  Collection<int, Appointment>  $busyAppointments
     * @return array<int, AvailableSlotData>
     */
    private function slotsWithinInterval(
        array $interval,
        int $durationMinutes,
        CarbonImmutable $now,
        Collection $busyAppointments
    ): array {
        $slots = [];
        $slotStart = $interval['start'];

        while (true) {
            $slotEnd = $slotStart->addMinutes($durationMinutes);

            if ($slotEnd->gt($interval['end'])) {
                break;
            }

            if ($slotStart->lt($now)) {
                $slotStart = $slotEnd;

                continue;
            }

            $overlapsBusy = $busyAppointments->contains(
                fn (Appointment $appointment): bool => $appointment->start_at < $slotEnd && $appointment->end_at > $slotStart,
            );

            if (! $overlapsBusy) {
                $slots[] = new AvailableSlotData($slotStart, $slotEnd);
            }

            $slotStart = $slotEnd;
        }

        return $slots;
    }
}
