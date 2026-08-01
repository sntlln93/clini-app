<?php

declare(strict_types=1);

namespace App\Actions\Booking;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Booking\PublishedDayIntervalsData;
use App\Enums\AvailabilityExceptionType;
use App\Models\Availability;
use App\Models\AvailabilityException;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection as SupportCollection;

/**
 * Computes a single calendar day's *published* schedule for a membership:
 * weekly `availabilities` for that day-of-week, plus `extra` exceptions,
 * minus `blocked` exceptions. Never excludes time already taken by busy
 * appointments — that is each caller's own concern (ListAvailableSlotsAction
 * subtracts busy appointments per slot; AssertSlotWithinPublishedScheduleAction
 * never does). `day` must already be anchored to the organization's own
 * timezone by the caller.
 *
 * @implements Action<PublishedDayIntervalsData>
 */
class ComputePublishedDayIntervalsAction implements Action
{
    /**
     * @param  PublishedDayIntervalsData  $dto
     * @return array<int, array{start: CarbonImmutable, end: CarbonImmutable}>
     */
    public function handle(Data $dto): array
    {
        $day = $dto->day;
        $dayEnd = $day->addDay();

        $availabilitiesByDay = Availability::query()
            ->where('membership_id', $dto->membershipId)
            ->where('day_of_week', $day->dayOfWeek)
            ->get()
            ->groupBy('day_of_week');

        $exceptions = AvailabilityException::query()
            ->where('membership_id', $dto->membershipId)
            ->where('start_at', '<', $dayEnd)
            ->where('end_at', '>', $day)
            ->get();

        return $this->intervalsForDay($day, $availabilitiesByDay, $exceptions);
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
}
