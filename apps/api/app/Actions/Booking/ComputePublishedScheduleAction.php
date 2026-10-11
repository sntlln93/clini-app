<?php

declare(strict_types=1);

namespace App\Actions\Booking;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Booking\PublishedScheduleData;
use App\Enums\AvailabilityExceptionType;
use App\Models\Availability;
use App\Models\AvailabilityException;
use App\Models\Holiday;
use App\Models\Organization;
use App\Models\OrganizationHoliday;
use App\Support\Intervals;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;

/**
 * The *published* schedule of each membership, per local calendar day of
 * the organization's timezone: weekly `availabilities` plus `extra`
 * exceptions, minus `blocked` exceptions (the professional's own and the
 * whole organization's, `membership_id` null; an organization-wide `extra`
 * opens nobody's agenda) — never excluding time already
 * taken by busy appointments, which stays each caller's own concern. A
 * holiday publishes no intervals at all, regardless of availability: a
 * national catalog holiday, a catalog holiday of the organization's province
 * (address → city → province), or one of the organization's own
 * `organization_holidays`. Loads the whole range in a fixed number of queries.
 *
 * @implements Action<PublishedScheduleData>
 */
class ComputePublishedScheduleAction implements Action
{
    /**
     * @param  PublishedScheduleData  $dto
     * @return array<int, array<string, array<int, array{start: CarbonImmutable, end: CarbonImmutable}>>> intervals by membership id, then by Y-m-d
     */
    public function handle(Data $dto): array
    {
        $organization = Organization::query()->with('address.city')->findOrFail($dto->organizationId);
        $timezone = $organization->timezone;
        $firstDay = CarbonImmutable::parse($dto->fromDate, $timezone)->startOfDay();
        $lastDay = CarbonImmutable::parse($dto->toDate, $timezone)->startOfDay();

        $availabilities = Availability::withoutGlobalScope('organization')
            ->where('organization_id', $organization->id)
            ->whereIn('membership_id', $dto->membershipIds)
            ->get()
            ->groupBy(fn (Availability $availability): string => $availability->membership_id.':'.$availability->day_of_week);

        // Bound as UTC: the columns hold UTC instants, and a query binding keeps a Carbon's own wall-clock time.
        $exceptions = AvailabilityException::withoutGlobalScope('organization')
            ->where('organization_id', $organization->id)
            ->where(fn ($query) => $query
                ->whereIn('membership_id', $dto->membershipIds)
                ->orWhere(fn ($query) => $query->whereNull('membership_id')->where('type', AvailabilityExceptionType::Blocked)))
            ->where('start_at', '<', $lastDay->addDay()->utc())
            ->where('end_at', '>', $firstDay->utc())
            ->get();

        $holidays = $this->holidayDates($organization, $dto->fromDate, $dto->toDate);
        $schedule = [];

        foreach ($dto->membershipIds as $membershipId) {
            $applicable = $exceptions->filter(
                fn (AvailabilityException $exception): bool => $exception->membership_id === null || $exception->membership_id === $membershipId,
            );

            foreach ($this->dates($dto->fromDate, $dto->toDate) as $date => $nextDate) {
                // Each bound from its own date, never by adding a day: a daylight-saving gap at midnight would shift every later day.
                $day = CarbonImmutable::parse($date, $timezone)->startOfDay();
                $schedule[$membershipId][$date] = isset($holidays[$date])
                    ? []
                    : $this->intervalsForDay($day, CarbonImmutable::parse($nextDate, $timezone)->startOfDay(), $availabilities->get($membershipId.':'.$day->dayOfWeek) ?? new Collection, $applicable);
            }
        }

        return $schedule;
    }

    /**
     * @param  Collection<int, Availability>  $weekly
     * @param  Collection<int, AvailabilityException>  $exceptions
     * @return array<int, array{start: CarbonImmutable, end: CarbonImmutable}>
     */
    private function intervalsForDay(CarbonImmutable $day, CarbonImmutable $dayEnd, Collection $weekly, Collection $exceptions): array
    {
        $base = $weekly->map(fn (Availability $availability): array => [
            'start' => $this->combineDateAndTime($day, $availability->start_time),
            'end' => $this->combineDateAndTime($day, $availability->end_time),
        ])->all();

        $extra = $this->clippedOfType($exceptions, AvailabilityExceptionType::Extra, $day, $dayEnd);
        $blocked = $this->clippedOfType($exceptions, AvailabilityExceptionType::Blocked, $day, $dayEnd);

        // An `extra` exception may overlap the weekly windows; merging keeps one continuous range instead of two overlapping slot grids.
        return Intervals::subtract(Intervals::merge([...$base, ...$extra]), $blocked);
    }

    /**
     * @param  Collection<int, AvailabilityException>  $exceptions
     * @return array<int, array{start: CarbonImmutable, end: CarbonImmutable}>
     */
    private function clippedOfType(Collection $exceptions, AvailabilityExceptionType $type, CarbonImmutable $dayStart, CarbonImmutable $dayEnd): array
    {
        $clipped = [];

        foreach ($exceptions as $exception) {
            if ($exception->type !== $type) {
                continue;
            }

            /** @var Carbon $start */
            $start = $exception->start_at;
            /** @var Carbon $end */
            $end = $exception->end_at;
            $interval = Intervals::clip(CarbonImmutable::instance($start), CarbonImmutable::instance($end), $dayStart, $dayEnd);

            if ($interval !== null) {
                $clipped[] = $interval;
            }
        }

        return $clipped;
    }

    /**
     * @return array<string, string> each Y-m-d of the range, mapped to the next one
     */
    private function dates(string $fromDate, string $toDate): array
    {
        $dates = [];

        for ($date = CarbonImmutable::parse($fromDate); $date->toDateString() <= $toDate; $date = $date->addDay()) {
            $dates[$date->toDateString()] = $date->addDay()->toDateString();
        }

        return $dates;
    }

    /**
     * @return array<string, true> keyed by Y-m-d
     */
    private function holidayDates(Organization $organization, string $fromDate, string $toDate): array
    {
        $provinceId = $organization->address?->city?->province_id;

        $catalog = Holiday::query()
            ->whereBetween('date', [$fromDate, $toDate])
            ->where(fn ($query) => $query
                ->whereNull('province_id')
                ->when($provinceId !== null, fn ($query) => $query->orWhere('province_id', $provinceId)))
            ->get(['date'])
            ->map(fn (Holiday $holiday): string => $holiday->date->toDateString());

        $own = OrganizationHoliday::query()
            ->where('organization_id', $organization->id)
            ->whereBetween('date', [$fromDate, $toDate])
            ->get(['date'])
            ->map(fn (OrganizationHoliday $holiday): string => $holiday->date->toDateString());

        return array_fill_keys([...$catalog, ...$own], true);
    }

    private function combineDateAndTime(CarbonImmutable $day, string $time): CarbonImmutable
    {
        [$hour, $minute, $second] = array_pad(explode(':', $time), 3, '0');

        return $day->setTime((int) $hour, (int) $minute, (int) $second);
    }
}
