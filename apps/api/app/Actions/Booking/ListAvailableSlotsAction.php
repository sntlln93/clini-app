<?php

declare(strict_types=1);

namespace App\Actions\Booking;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Booking\AvailableSlotData;
use App\Data\Booking\SlotSearchData;
use App\Enums\AppointmentStatus;
use App\Enums\AvailabilityExceptionType;
use App\Models\Appointment;
use App\Models\Availability;
use App\Models\AvailabilityException;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\ProfessionalService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection as SupportCollection;

/**
 * Computes the grid of bookable slots for a membership+service pair over a
 * date range: weekly `availabilities`, plus `extra` exceptions, minus
 * `blocked` exceptions and any overlapping active appointment of the same
 * physical professional (across organizations, same rule as
 * BookAppointmentAction). Holidays are deliberately never subtracted (owner
 * decision, see the handoff). Everything runs in the organization's own
 * timezone (`organizations.timezone`); the app itself runs in UTC.
 *
 * @implements Action<SlotSearchData>
 */
class ListAvailableSlotsAction implements Action
{
    public const int BOOKING_WINDOW_DAYS = 60;

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

        $availabilitiesByDay = Availability::query()
            ->where('membership_id', $dto->membershipId)
            ->get()
            ->groupBy('day_of_week');

        $exceptions = AvailabilityException::query()
            ->where('membership_id', $dto->membershipId)
            ->where('start_at', '<', $rangeEnd)
            ->where('end_at', '>', $cursor)
            ->get();

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
            $dayIntervals = $this->intervalsForDay($cursor, $availabilitiesByDay, $exceptions);

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
     * @param  SupportCollection<int|string, Collection<int, Availability>>  $availabilitiesByDay
     * @param  Collection<int, AvailabilityException>  $exceptions
     * @return array<int, array{start: CarbonImmutable, end: CarbonImmutable}>
     */
    private function intervalsForDay(
        CarbonImmutable $day,
        SupportCollection $availabilitiesByDay,
        Collection $exceptions
    ): array {
        $dayStart = $day;
        $dayEnd = $day->addDay();

        $baseIntervals = ($availabilitiesByDay->get($day->dayOfWeek) ?? collect())
            ->map(fn (Availability $availability): array => [
                'start' => $this->combineDateAndTime($day, $availability->start_time),
                'end' => $this->combineDateAndTime($day, $availability->end_time),
            ])
            ->all();

        $extraIntervals = $exceptions
            ->filter(fn (AvailabilityException $exception): bool => $this->isExceptionType($exception, AvailabilityExceptionType::Extra))
            ->map(fn (AvailabilityException $exception): ?array => $this->clipToDay($exception, $dayStart, $dayEnd))
            ->filter()
            ->all();

        $blockedIntervals = $exceptions
            ->filter(fn (AvailabilityException $exception): bool => $this->isExceptionType($exception, AvailabilityExceptionType::Blocked))
            ->map(fn (AvailabilityException $exception): ?array => $this->clipToDay($exception, $dayStart, $dayEnd))
            ->filter()
            ->all();

        return $this->subtractIntervals([...$baseIntervals, ...$extraIntervals], $blockedIntervals);
    }

    private function isExceptionType(AvailabilityException $exception, AvailabilityExceptionType $type): bool
    {
        /** @var AvailabilityExceptionType $actual */
        $actual = $exception->type;

        return $actual === $type;
    }

    /**
     * @return array{start: CarbonImmutable, end: CarbonImmutable}|null
     */
    private function clipToDay(AvailabilityException $exception, CarbonImmutable $dayStart, CarbonImmutable $dayEnd): ?array
    {
        /** @var Carbon $exceptionStart */
        $exceptionStart = $exception->start_at;
        /** @var Carbon $exceptionEnd */
        $exceptionEnd = $exception->end_at;

        $start = CarbonImmutable::instance($exceptionStart)->max($dayStart);
        $end = CarbonImmutable::instance($exceptionEnd)->min($dayEnd);

        return $start->lt($end) ? ['start' => $start, 'end' => $end] : null;
    }

    private function combineDateAndTime(CarbonImmutable $day, string $time): CarbonImmutable
    {
        [$hour, $minute, $second] = array_pad(explode(':', $time), 3, '0');

        return $day->setTime((int) $hour, (int) $minute, (int) $second);
    }

    /**
     * @param  array<int, array{start: CarbonImmutable, end: CarbonImmutable}>  $intervals
     * @param  array<int, array{start: CarbonImmutable, end: CarbonImmutable}>  $blocked
     * @return array<int, array{start: CarbonImmutable, end: CarbonImmutable}>
     */
    private function subtractIntervals(array $intervals, array $blocked): array
    {
        foreach ($blocked as $block) {
            $remaining = [];

            foreach ($intervals as $interval) {
                if ($block['end']->lte($interval['start']) || $block['start']->gte($interval['end'])) {
                    $remaining[] = $interval;

                    continue;
                }

                if ($block['start']->gt($interval['start'])) {
                    $remaining[] = ['start' => $interval['start'], 'end' => $block['start']];
                }

                if ($block['end']->lt($interval['end'])) {
                    $remaining[] = ['start' => $block['end'], 'end' => $interval['end']];
                }
            }

            $intervals = $remaining;
        }

        return array_values(array_filter(
            $intervals,
            fn (array $interval): bool => $interval['start']->lt($interval['end']),
        ));
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
