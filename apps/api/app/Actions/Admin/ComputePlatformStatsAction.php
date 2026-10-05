<?php

declare(strict_types=1);

namespace App\Actions\Admin;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Admin\PlatformStatsData;
use App\Data\Admin\StatsPeriodData;
use App\Enums\AppointmentOrigin;
use App\Enums\AppointmentStatus;
use App\Enums\ReminderChannel;
use App\Enums\ReminderStatus;
use App\Models\Appointment;
use App\Models\Organization;
use App\Models\Patient;
use App\Models\Reminder;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Facades\DB;

/**
 * Platform usage statistics over an inclusive range of local dates in the
 * reporting timezone — UTC bounds `[from 00:00 local, (to + 1) 00:00 local)`
 * — optionally narrowed to one organization.
 *
 * - Appointments: non-soft-deleted, by `start_at` (the scheduled date).
 *   `cancellation_rate` excludes rescheduled originals from its denominator
 *   (their replacement is counted instead); `no_show_rate` is over the
 *   appointments that reached their time (arrived, completed, no-show).
 * - Patients: global `patients.created_at`, or — filtered — when they were
 *   linked to that organization (`organization_patient.created_at`).
 * - Reminders: by `scheduled_at`.
 *
 * Every enum breakdown always carries all its keys; rates are null when
 * their denominator is zero.
 *
 * @implements Action<StatsPeriodData>
 */
class ComputePlatformStatsAction implements Action
{
    /**
     * @param  StatsPeriodData  $dto
     */
    public function handle(Data $dto): PlatformStatsData
    {
        $from = $dto->from->setTimezone($dto->timezone)->startOfDay();
        $to = $dto->to->setTimezone($dto->timezone)->startOfDay();
        $fromUtc = $from->utc();
        $toUtcExclusive = $to->addDay()->utc();

        $organization = $dto->organizationId === null
            ? null
            : Organization::withTrashed()->find($dto->organizationId);

        return new PlatformStatsData(
            period: [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'timezone' => $dto->timezone,
                'organization' => $organization === null ? null : ['id' => $organization->id, 'name' => $organization->name],
            ],
            appointments: $this->appointments($dto, $from, $to, $fromUtc, $toUtcExclusive),
            patients: $this->patients($dto, $from, $to, $fromUtc, $toUtcExclusive),
            reminders: $this->reminders($dto, $fromUtc, $toUtcExclusive),
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function appointments(StatsPeriodData $dto, CarbonImmutable $from, CarbonImmutable $to, CarbonImmutable $fromUtc, CarbonImmutable $toUtcExclusive): array
    {
        $query = fn (): QueryBuilder => Appointment::withoutGlobalScope('organization')
            ->where('start_at', '>=', $fromUtc)
            ->where('start_at', '<', $toUtcExclusive)
            ->when($dto->organizationId !== null, fn ($query) => $query->where('organization_id', $dto->organizationId))
            ->toBase();

        $byStatus = $this->countBy($query(), 'status', array_map(fn (AppointmentStatus $status): string => $status->value, AppointmentStatus::cases()));
        $byOrigin = $this->countBy($query(), 'origin', array_map(fn (AppointmentOrigin $origin): string => $origin->value, AppointmentOrigin::cases()));
        $total = array_sum($byStatus);

        $perDayRows = $query()
            ->selectRaw("to_char((start_at AT TIME ZONE 'UTC') AT TIME ZONE ?, 'YYYY-MM-DD') as day, origin, count(*) as aggregate", [$dto->timezone])
            ->groupBy('day', 'origin')
            ->get();

        /** @var array<string, array<string, int>> $perDayCounts */
        $perDayCounts = [];
        foreach ($perDayRows as $row) {
            $perDayCounts[$this->toString($row->day)][$this->toString($row->origin)] = $this->toInt($row->aggregate);
        }

        $perDay = [];
        foreach ($this->dates($from, $to) as $date) {
            $online = $perDayCounts[$date][AppointmentOrigin::Online->value] ?? 0;
            $manual = $perDayCounts[$date][AppointmentOrigin::Manual->value] ?? 0;
            $perDay[] = ['date' => $date, 'total' => $online + $manual, 'online' => $online, 'manual' => $manual];
        }

        $cancelled = $byStatus[AppointmentStatus::Cancelled->value];
        $rescheduled = $byStatus[AppointmentStatus::Rescheduled->value];
        $noShow = $byStatus[AppointmentStatus::NoShow->value];
        $attended = $byStatus[AppointmentStatus::Arrived->value] + $byStatus[AppointmentStatus::Completed->value];

        return [
            'total' => $total,
            'by_status' => $byStatus,
            'by_origin' => $byOrigin,
            'cancellation_rate' => $this->rate($cancelled, $total - $rescheduled),
            'no_show_rate' => $this->rate($noShow, $attended + $noShow),
            'per_day' => $perDay,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function patients(StatsPeriodData $dto, CarbonImmutable $from, CarbonImmutable $to, CarbonImmutable $fromUtc, CarbonImmutable $toUtcExclusive): array
    {
        $query = $dto->organizationId === null
            ? Patient::query()
                ->where('created_at', '>=', $fromUtc)
                ->where('created_at', '<', $toUtcExclusive)
                ->toBase()
                ->selectRaw("to_char((created_at AT TIME ZONE 'UTC') AT TIME ZONE ?, 'YYYY-MM-DD') as day, count(*) as aggregate", [$dto->timezone])
            : DB::table('organization_patient')
                ->join('patients', 'patients.id', '=', 'organization_patient.patient_id')
                ->whereNull('patients.deleted_at')
                ->where('organization_patient.organization_id', $dto->organizationId)
                ->where('organization_patient.created_at', '>=', $fromUtc)
                ->where('organization_patient.created_at', '<', $toUtcExclusive)
                ->selectRaw("to_char((organization_patient.created_at AT TIME ZONE 'UTC') AT TIME ZONE ?, 'YYYY-MM-DD') as day, count(*) as aggregate", [$dto->timezone]);

        $counts = $query->groupBy('day')->pluck('aggregate', 'day');

        $perDay = [];
        foreach ($this->dates($from, $to) as $date) {
            $perDay[] = ['date' => $date, 'count' => $this->toInt($counts[$date] ?? 0)];
        }

        return [
            'new' => array_sum(array_column($perDay, 'count')),
            'per_day' => $perDay,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function reminders(StatsPeriodData $dto, CarbonImmutable $fromUtc, CarbonImmutable $toUtcExclusive): array
    {
        $query = fn (): QueryBuilder => Reminder::withoutGlobalScope('organization')
            ->where('scheduled_at', '>=', $fromUtc)
            ->where('scheduled_at', '<', $toUtcExclusive)
            ->when($dto->organizationId !== null, fn ($query) => $query->where('organization_id', $dto->organizationId))
            ->toBase();

        $byStatus = $this->countBy($query(), 'status', array_map(fn (ReminderStatus $status): string => $status->value, ReminderStatus::cases()));
        $byChannel = $this->countBy($query(), 'channel', array_map(fn (ReminderChannel $channel): string => $channel->value, ReminderChannel::cases()));

        $sent = $byStatus[ReminderStatus::Sent->value];
        $failed = $byStatus[ReminderStatus::Failed->value];

        return [
            'total' => array_sum($byStatus),
            'by_status' => $byStatus,
            'by_channel' => $byChannel,
            'failure_rate' => $this->rate($failed, $sent + $failed),
        ];
    }

    /**
     * Row counts grouped by `$column`, with every key of `$keys` present.
     *
     * @param  array<int, string>  $keys
     * @return array<string, int>
     */
    private function countBy(QueryBuilder $query, string $column, array $keys): array
    {
        $counts = $query
            ->select($column)
            ->selectRaw('count(*) as aggregate')
            ->groupBy($column)
            ->pluck('aggregate', $column);

        $result = [];
        foreach ($keys as $key) {
            $result[$key] = $this->toInt($counts[$key] ?? 0);
        }

        return $result;
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

    /**
     * @return array<int, string>
     */
    private function dates(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $dates = [];
        for ($day = $from; $day->lessThanOrEqualTo($to); $day = $day->addDay()) {
            $dates[] = $day->toDateString();
        }

        return $dates;
    }
}
