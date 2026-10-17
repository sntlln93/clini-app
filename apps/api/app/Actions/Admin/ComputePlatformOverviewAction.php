<?php

declare(strict_types=1);

namespace App\Actions\Admin;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Admin\ActivityFeedQueryData;
use App\Data\Admin\OverviewPeriodData;
use App\Data\Admin\PlatformOverviewData;
use App\Enums\AppointmentStatus;
use App\Enums\SubscriptionBilling;
use App\Enums\SubscriptionStatus;
use App\Models\Appointment;
use App\Models\Organization;
use App\Models\Patient;
use App\Models\Subscription;
use App\Models\User;
use App\Support\PracticePricing;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Platform-wide KPIs, the zero-filled daily series of the last `days`
 * local days (today included) and the recent-activity feed. Days are
 * bucketed in the reporting timezone; the app itself stores UTC.
 *
 * Soft-deleted organizations, patients and appointments are excluded
 * everywhere; subscription counts only consider live organizations, so
 * the six subscription keys always sum to `organizations.total`.
 *
 * @implements Action<OverviewPeriodData>
 */
class ComputePlatformOverviewAction implements Action
{
    public const int ACTIVITY_LIMIT = 15;

    public function __construct(
        private readonly ListRecentPlatformActivityAction $listRecentActivity,
        private readonly PracticePricing $pricing,
    ) {}

    /**
     * @param  OverviewPeriodData  $dto
     */
    public function handle(Data $dto): PlatformOverviewData
    {
        $today = CarbonImmutable::now($dto->timezone)->startOfDay();
        $from = $today->subDays($dto->days - 1);
        $fromUtc = $from->utc();
        $toUtcExclusive = $today->addDay()->utc();

        $kpis = [
            'organizations' => [
                'total' => Organization::query()->count(),
                'suspended' => Organization::query()->whereNotNull('suspended_at')->count(),
                'new_in_period' => $this->createdBetween(Organization::query(), $fromUtc, $toUtcExclusive)->count(),
            ],
            'users' => [
                'total' => User::query()->count(),
                'verified' => User::query()->verified(true)->count(),
                'blocked' => User::query()->blocked(true)->count(),
                'new_in_period' => $this->createdBetween(User::query(), $fromUtc, $toUtcExclusive)->count(),
            ],
            'patients' => [
                'total' => Patient::query()->count(),
                'new_in_period' => $this->createdBetween(Patient::query(), $fromUtc, $toUtcExclusive)->count(),
            ],
            'appointments' => [
                'total' => Appointment::withoutGlobalScope('organization')->count(),
                'created_in_period' => $this->createdBetween(Appointment::withoutGlobalScope('organization'), $fromUtc, $toUtcExclusive)->count(),
                'upcoming' => Appointment::withoutGlobalScope('organization')
                    ->where('start_at', '>=', now())
                    ->whereIn('status', [AppointmentStatus::Scheduled, AppointmentStatus::Confirmed])
                    ->count(),
            ],
            'subscriptions' => $this->subscriptionCounts(),
            'mrr' => $this->mrr(),
        ];

        $organizationsPerDay = $this->perDay(Organization::query(), $fromUtc, $toUtcExclusive, $dto->timezone);
        $usersPerDay = $this->perDay(User::query(), $fromUtc, $toUtcExclusive, $dto->timezone);
        $appointmentsPerDay = $this->perDay(Appointment::withoutGlobalScope('organization'), $fromUtc, $toUtcExclusive, $dto->timezone);

        $points = [];
        for ($day = $from; $day->lessThanOrEqualTo($today); $day = $day->addDay()) {
            $date = $day->toDateString();
            $points[] = [
                'date' => $date,
                'organizations' => $organizationsPerDay[$date] ?? 0,
                'users' => $usersPerDay[$date] ?? 0,
                'appointments' => $appointmentsPerDay[$date] ?? 0,
            ];
        }

        return new PlatformOverviewData(
            kpis: $kpis,
            series: [
                'from' => $from->toDateString(),
                'to' => $today->toDateString(),
                'timezone' => $dto->timezone,
                'points' => $points,
            ],
            recentActivity: $this->listRecentActivity->handle(new ActivityFeedQueryData(self::ACTIVITY_LIMIT)),
        );
    }

    /**
     * @return array<string, int>
     */
    private function subscriptionCounts(): array
    {
        $byStatus = Subscription::withoutGlobalScope('organization')
            ->ofLiveOrganization()
            ->toBase()
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $counts = [
            'none' => Organization::query()
                ->whereDoesntHave('subscription', fn (Builder $query) => $query->withoutGlobalScope('organization'))
                ->count(),
        ];

        foreach (SubscriptionStatus::cases() as $status) {
            $counts[$status->value] = $this->toInt($byStatus[$status->value] ?? 0);
        }

        return $counts;
    }

    /**
     * Estimated monthly recurring revenue: the amount of every subscription
     * still paying (active + grace), spread per month for an annual one
     * (#240), or the Practice base price for one with no stored amount.
     *
     * @return array<string, int|string>
     */
    private function mrr(): array
    {
        $planAmount = $this->pricing->baseAmount();

        $subscriptions = Subscription::withoutGlobalScope('organization')
            ->ofLiveOrganization()
            ->whereIn('status', [SubscriptionStatus::Active, SubscriptionStatus::Grace])
            ->get(['amount', 'billing']);
        $paying = $subscriptions->count();

        return [
            'amount' => $subscriptions->sum(function (Subscription $subscription) use ($planAmount): int {
                /** @var SubscriptionBilling $billing */
                $billing = $subscription->billing;

                return $subscription->amount !== null
                    ? $this->pricing->monthlyEquivalent($subscription->amount, $billing)
                    : $planAmount;
            }),
            'currency' => $this->pricing->currency(),
            'paying_subscriptions' => $paying,
            'plan_amount' => $planAmount,
        ];
    }

    /**
     * @template TModel of Model
     *
     * @param  Builder<TModel>  $query
     * @return Builder<TModel>
     */
    private function createdBetween(Builder $query, CarbonImmutable $fromUtc, CarbonImmutable $toUtcExclusive): Builder
    {
        return $query->where('created_at', '>=', $fromUtc)->where('created_at', '<', $toUtcExclusive);
    }

    /**
     * Rows created per local date in `$timezone`, keyed `Y-m-d`.
     *
     * @template TModel of Model
     *
     * @param  Builder<TModel>  $query
     * @return array<string, int>
     */
    private function perDay(Builder $query, CarbonImmutable $fromUtc, CarbonImmutable $toUtcExclusive, string $timezone): array
    {
        return $this->createdBetween($query, $fromUtc, $toUtcExclusive)
            ->toBase()
            ->selectRaw("to_char(created_at AT TIME ZONE ?, 'YYYY-MM-DD') as day, count(*) as aggregate", [$timezone])
            ->groupBy('day')
            ->pluck('aggregate', 'day')
            ->map(fn (mixed $count): int => $this->toInt($count))
            ->all();
    }

    /** Aggregates come back from PDO as int or numeric string. */
    private function toInt(mixed $value): int
    {
        return is_numeric($value) ? (int) $value : 0;
    }
}
