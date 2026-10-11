<?php

declare(strict_types=1);

namespace App\Actions\Reports;

use App\Actions\Booking\ComputePublishedScheduleAction;
use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Booking\PublishedScheduleData;
use App\Data\Reports\OrganizationReportData;
use App\Data\Reports\ReportPeriodData;
use App\Enums\AppointmentOrigin;
use App\Enums\AppointmentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\ReportGranularity;
use App\Models\Appointment;
use App\Models\Membership;
use App\Support\Intervals;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Occupancy, no-shows, booking origin and new patients of an organization
 * (#242), bucketed by local calendar day of its timezone.
 *
 * - Occupancy: minutes of active appointments (not cancelled or rescheduled)
 *   inside the published schedule, over the published minutes. Time booked
 *   outside the published schedule doesn't count, so it never exceeds 100%.
 * - No-show rate: `no_show` over the appointments that reached their time
 *   (`arrived`, `completed` or `no_show`), the same rule as the platform stats.
 * - Origin: every booking except a rescheduled original, whose replacement
 *   keeps its origin and is counted instead.
 * - New patients: link date to the organization, for the whole organization only.
 *
 * @implements Action<ReportPeriodData>
 */
class ComputeOrganizationReportAction implements Action
{
    private const array INACTIVE_STATUSES = [AppointmentStatus::Cancelled, AppointmentStatus::Rescheduled];

    public function __construct(
        private readonly ComputePublishedScheduleAction $computePublishedSchedule,
    ) {}

    /**
     * @param  ReportPeriodData  $dto
     */
    public function handle(Data $dto): OrganizationReportData
    {
        $firstDay = CarbonImmutable::parse($dto->fromDate, $dto->timezone)->startOfDay();
        $lastDay = CarbonImmutable::parse($dto->toDate, $dto->timezone)->startOfDay();
        $fromUtc = $firstDay->utc();
        $toUtc = $lastDay->addDay()->utc();

        $buckets = $this->buckets($firstDay, $lastDay, $dto->granularity);
        $bucketOf = [];
        foreach ($buckets as $index => $bucket) {
            for ($day = CarbonImmutable::parse($bucket['start']); $day->toDateString() <= $bucket['end']; $day = $day->addDay()) {
                $bucketOf[$day->toDateString()] = $index;
            }
        }

        $professionals = $this->professionals($dto, $fromUtc, $toUtc);
        $occupancy = $this->occupancy($dto, $professionals, $bucketOf, $fromUtc, $toUtc);
        $counts = $this->appointmentCounts($dto, $bucketOf, $fromUtc, $toUtc);

        $series = [];
        foreach ($buckets as $index => $bucket) {
            $published = $occupancy['buckets'][$index]['published'] ?? 0;
            $booked = $occupancy['buckets'][$index]['booked'] ?? 0;
            $bucketCounts = $counts['buckets'][$index] ?? [];
            $series[] = [
                ...$bucket,
                ...$this->occupancyFields($published, $booked),
                ...$this->noShowFields($bucketCounts['attended'] ?? 0, $bucketCounts['no_show'] ?? 0),
                'online' => $bucketCounts['online'] ?? 0,
                'manual' => $bucketCounts['manual'] ?? 0,
            ];
        }

        return new OrganizationReportData(
            period: [
                'from' => $firstDay->toDateString(),
                'to' => $lastDay->toDateString(),
                'timezone' => $dto->timezone,
                'granularity' => $dto->granularity->value,
            ],
            professionals: $professionals->map(fn (Membership $membership): array => [
                'membership_id' => $membership->id,
                'name' => $membership->user?->name,
                ...$this->occupancyFields($occupancy['members'][$membership->id]['published'] ?? 0, $occupancy['members'][$membership->id]['booked'] ?? 0),
                ...$this->noShowFields($counts['members'][$membership->id]['attended'] ?? 0, $counts['members'][$membership->id]['no_show'] ?? 0),
            ])->values()->all(),
            series: $series,
            origin: [
                'online' => array_sum(array_column($series, 'online')),
                'manual' => array_sum(array_column($series, 'manual')),
            ],
            newPatients: $dto->membershipId === null ? $this->newPatients($dto, $firstDay, $lastDay, $fromUtc, $toUtc) : null,
        );
    }

    /**
     * Active professionals, plus any membership with an appointment in the
     * period — even deactivated (soft-deleted) or no longer a professional —
     * so a past professional's history doesn't disappear and the rows add up
     * to the period totals.
     *
     * @return Collection<int, Membership>
     */
    private function professionals(ReportPeriodData $dto, CarbonImmutable $fromUtc, CarbonImmutable $toUtc): Collection
    {
        return Membership::withTrashed()
            ->with('user:id,name')
            ->where('organization_id', $dto->organizationId)
            ->when($dto->membershipId !== null, fn ($query) => $query->whereKey($dto->membershipId))
            ->where(fn ($query) => $query
                ->where(fn ($query) => $query
                    ->whereNull('deleted_at')
                    ->where('status', MembershipStatus::Active)
                    ->whereJsonContains('roles', MembershipRole::Professional->value))
                ->orWhereHas('appointments', fn ($query) => $query->where('start_at', '>=', $fromUtc)->where('start_at', '<', $toUtc)))
            ->get()
            ->sortBy(fn (Membership $membership): string => mb_strtolower((string) $membership->user?->name))
            ->values();
    }

    /**
     * @param  Collection<int, Membership>  $professionals
     * @param  array<string, int>  $bucketOf
     * @return array{members: array<int, array<string, int>>, buckets: array<int, array<string, int>>}
     */
    private function occupancy(ReportPeriodData $dto, Collection $professionals, array $bucketOf, CarbonImmutable $fromUtc, CarbonImmutable $toUtc): array
    {
        $result = ['members' => [], 'buckets' => []];

        if ($professionals->isEmpty()) {
            return $result;
        }

        $schedule = $this->computePublishedSchedule->handle(new PublishedScheduleData(
            organizationId: $dto->organizationId,
            membershipIds: $professionals->modelKeys(),
            fromDate: $dto->fromDate,
            toDate: $dto->toDate,
        ));

        $appointments = Appointment::query()
            ->where('organization_id', $dto->organizationId)
            ->whereIn('membership_id', $professionals->modelKeys())
            ->whereNotIn('status', self::INACTIVE_STATUSES)
            ->where('start_at', '<', $toUtc)
            ->where('end_at', '>', $fromUtc)
            ->get(['membership_id', 'start_at', 'end_at'])
            ->groupBy('membership_id');

        foreach ($schedule as $membershipId => $days) {
            $bookedByDay = $this->byLocalDay($appointments->get($membershipId) ?? new Collection, $dto->timezone);

            foreach ($days as $date => $published) {
                $dayStart = CarbonImmutable::parse($date, $dto->timezone)->startOfDay();
                $dayEnd = CarbonImmutable::parse(CarbonImmutable::parse($date)->addDay()->toDateString(), $dto->timezone)->startOfDay();
                $dayBooked = Intervals::merge(array_values(array_filter(array_map(
                    fn (Appointment $appointment): ?array => $this->clip($appointment, $dayStart, $dayEnd),
                    $bookedByDay[$date] ?? [],
                ))));

                $publishedMinutes = Intervals::minutes($published);
                $bookedMinutes = Intervals::minutes($dayBooked) - Intervals::minutes(Intervals::subtract($dayBooked, $published));

                $amounts = ['published' => $publishedMinutes, 'booked' => $bookedMinutes];
                $result['members'][$membershipId] = $this->add($result['members'][$membershipId] ?? [], $amounts);
                $result['buckets'][$bucketOf[$date]] = $this->add($result['buckets'][$bucketOf[$date]] ?? [], $amounts);
            }
        }

        return $result;
    }

    /**
     * @param  array<string, int>  $bucketOf
     * @return array{members: array<int, array<string, int>>, buckets: array<int, array<string, int>>}
     */
    private function appointmentCounts(ReportPeriodData $dto, array $bucketOf, CarbonImmutable $fromUtc, CarbonImmutable $toUtc): array
    {
        $rows = Appointment::query()
            ->where('organization_id', $dto->organizationId)
            ->when($dto->membershipId !== null, fn ($query) => $query->where('membership_id', $dto->membershipId))
            ->where('start_at', '>=', $fromUtc)
            ->where('start_at', '<', $toUtc)
            ->toBase()
            ->selectRaw("membership_id, status, origin, to_char((start_at AT TIME ZONE 'UTC') AT TIME ZONE ?, 'YYYY-MM-DD') as day, count(*) as aggregate", [$dto->timezone])
            ->groupBy('membership_id', 'status', 'origin', 'day')
            ->get();

        $result = ['members' => [], 'buckets' => []];

        foreach ($rows as $row) {
            $count = $this->toInt($row->aggregate);
            $status = AppointmentStatus::from($this->toString($row->status));
            $amounts = match ($status) {
                AppointmentStatus::Arrived, AppointmentStatus::Completed => ['attended' => $count],
                AppointmentStatus::NoShow => ['no_show' => $count],
                default => [],
            };

            if ($status !== AppointmentStatus::Rescheduled) {
                $amounts[AppointmentOrigin::from($this->toString($row->origin))->value] = $count;
            }

            $membershipId = $this->toInt($row->membership_id);
            $bucket = $bucketOf[$this->toString($row->day)];
            $result['members'][$membershipId] = $this->add($result['members'][$membershipId] ?? [], $amounts);
            $result['buckets'][$bucket] = $this->add($result['buckets'][$bucket] ?? [], $amounts);
        }

        return $result;
    }

    /**
     * @return array{total: int, per_month: array<int, array{month: string, count: int}>}
     */
    private function newPatients(ReportPeriodData $dto, CarbonImmutable $firstDay, CarbonImmutable $lastDay, CarbonImmutable $fromUtc, CarbonImmutable $toUtc): array
    {
        $counts = DB::table('organization_patient')
            ->join('patients', 'patients.id', '=', 'organization_patient.patient_id')
            ->whereNull('patients.deleted_at')
            ->where('organization_patient.organization_id', $dto->organizationId)
            ->where('organization_patient.created_at', '>=', $fromUtc)
            ->where('organization_patient.created_at', '<', $toUtc)
            ->selectRaw("to_char((organization_patient.created_at AT TIME ZONE 'UTC') AT TIME ZONE ?, 'YYYY-MM') as month, count(*) as aggregate", [$dto->timezone])
            ->groupBy('month')
            ->pluck('aggregate', 'month');

        $perMonth = [];
        for ($month = $firstDay->startOfMonth(); $month->lte($lastDay); $month = $month->addMonth()) {
            $perMonth[] = ['month' => $month->format('Y-m'), 'count' => $this->toInt($counts[$month->format('Y-m')] ?? 0)];
        }

        return ['total' => array_sum(array_column($perMonth, 'count')), 'per_month' => $perMonth];
    }

    /**
     * Calendar weeks (from Monday) or months, the first and last cut to the period.
     *
     * @return array<int, array{start: string, end: string}>
     */
    private function buckets(CarbonImmutable $firstDay, CarbonImmutable $lastDay, ReportGranularity $granularity): array
    {
        $buckets = [];
        $start = $firstDay;

        while ($start->lte($lastDay)) {
            $end = ($granularity === ReportGranularity::Week ? $start->endOfWeek(CarbonImmutable::SUNDAY) : $start->endOfMonth())
                ->startOfDay()
                ->min($lastDay);
            $buckets[] = ['start' => $start->toDateString(), 'end' => $end->toDateString()];
            $start = $end->addDay();
        }

        return $buckets;
    }

    /**
     * Each appointment under every local calendar day it touches, so a day only clips its own.
     *
     * @param  Collection<int, Appointment>  $appointments
     * @return array<string, array<int, Appointment>>
     */
    private function byLocalDay(Collection $appointments, string $timezone): array
    {
        $byDay = [];

        foreach ($appointments as $appointment) {
            /** @var Carbon $start */
            $start = $appointment->start_at;
            /** @var Carbon $end */
            $end = $appointment->end_at;
            $last = CarbonImmutable::instance($end)->subSecond()->setTimezone($timezone)->toDateString();

            for ($date = CarbonImmutable::instance($start)->setTimezone($timezone)->toDateString(); $date <= $last; $date = CarbonImmutable::parse($date)->addDay()->toDateString()) {
                $byDay[$date][] = $appointment;
            }
        }

        return $byDay;
    }

    /**
     * @param  array<string, int>  $tally
     * @param  array<string, int>  $amounts
     * @return array<string, int>
     */
    private function add(array $tally, array $amounts): array
    {
        foreach ($amounts as $key => $amount) {
            $tally[$key] = ($tally[$key] ?? 0) + $amount;
        }

        return $tally;
    }

    /**
     * @return array{start: CarbonImmutable, end: CarbonImmutable}|null
     */
    private function clip(Appointment $appointment, CarbonImmutable $dayStart, CarbonImmutable $dayEnd): ?array
    {
        /** @var Carbon $start */
        $start = $appointment->start_at;
        /** @var Carbon $end */
        $end = $appointment->end_at;

        return Intervals::clip(CarbonImmutable::instance($start), CarbonImmutable::instance($end), $dayStart, $dayEnd);
    }

    /**
     * @return array{published_minutes: int, booked_minutes: int, occupancy_rate: float|null}
     */
    private function occupancyFields(int $published, int $booked): array
    {
        return ['published_minutes' => $published, 'booked_minutes' => $booked, 'occupancy_rate' => $this->rate($booked, $published)];
    }

    /**
     * @return array{attended: int, no_show: int, no_show_rate: float|null}
     */
    private function noShowFields(int $attended, int $noShow): array
    {
        return ['attended' => $attended, 'no_show' => $noShow, 'no_show_rate' => $this->rate($noShow, $attended + $noShow)];
    }

    /** Aggregates come back from PDO as int or numeric string. */
    private function toInt(mixed $value): int
    {
        return is_numeric($value) ? (int) $value : 0;
    }

    private function toString(mixed $value): string
    {
        return is_string($value) ? $value : '';
    }

    private function rate(int $numerator, int $denominator): ?float
    {
        return $denominator <= 0 ? null : round($numerator / $denominator, 4);
    }
}
