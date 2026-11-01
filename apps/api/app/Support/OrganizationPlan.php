<?php

declare(strict_types=1);

namespace App\Support;

use App\Data\Subscriptions\PlanOverviewData;
use App\Enums\AppointmentStatus;
use App\Enums\MembershipRole;
use App\Enums\Plan;
use App\Enums\PlanFeature;
use App\Exceptions\Plans\PlanAppointmentLimitReachedException;
use App\Exceptions\Plans\PlanFeatureUnavailableException;
use App\Exceptions\Plans\PlanProfessionalLimitExceededException;
use App\Models\Appointment;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Subscription;
use Carbon\CarbonImmutable;

/**
 * Reads bypass the tenant scope: public booking and invitation acceptance have no current organization.
 */
final class OrganizationPlan
{
    public function of(int $organizationId): Plan
    {
        /** @var Plan|null $assigned */
        $assigned = Organization::query()->find($organizationId, ['id', 'assigned_plan'])?->assigned_plan;

        $subscription = Subscription::withoutGlobalScope('organization')
            ->where('organization_id', $organizationId)
            ->first();

        return Plan::resolve($assigned, $subscription);
    }

    public function overview(int $organizationId): PlanOverviewData
    {
        /** @var Plan|null $assigned */
        $assigned = Organization::query()->find($organizationId, ['id', 'assigned_plan'])?->assigned_plan;

        return new PlanOverviewData(
            plan: $this->of($organizationId),
            assignedByPlatform: $assigned !== null,
            activeProfessionals: $this->activeProfessionals($organizationId),
            appointmentsThisMonth: $this->appointmentsInMonth($organizationId, $this->monthOf($organizationId, CarbonImmutable::now())),
        );
    }

    public function activeProfessionals(int $organizationId): int
    {
        return Membership::withoutGlobalScope('organization')
            ->where('organization_id', $organizationId)
            ->activeProfessional()
            ->count();
    }

    /**
     * @throws PlanFeatureUnavailableException
     */
    public function ensureIncludes(int $organizationId, PlanFeature $feature): void
    {
        $plan = $this->of($organizationId);

        if (! $plan->includes($feature)) {
            throw new PlanFeatureUnavailableException($organizationId, $plan, $feature);
        }
    }

    /**
     * Callers pass only the gained roles, so a downgraded organization can still edit what it has.
     *
     * @param  array<int, MembershipRole>  $gainedRoles
     *
     * @throws PlanFeatureUnavailableException
     */
    public function ensureAllowsMember(int $organizationId, array $gainedRoles): void
    {
        $plan = $this->of($organizationId);

        if ($plan->includes(PlanFeature::Team)) {
            return;
        }

        $teamRoles = array_diff(
            array_map(fn (MembershipRole $role): string => $role->value, $gainedRoles),
            [MembershipRole::Professional->value],
        );

        $limit = $plan->professionalLimit();
        $exceedsLimit = in_array(MembershipRole::Professional, $gainedRoles, true)
            && $limit !== null
            && $this->activeProfessionals($organizationId) >= $limit;

        if ($teamRoles !== [] || $exceedsLimit) {
            throw new PlanFeatureUnavailableException($organizationId, $plan, PlanFeature::Team);
        }
    }

    /**
     * @throws PlanProfessionalLimitExceededException
     */
    public function ensureWithinProfessionalLimit(int $organizationId): void
    {
        $plan = $this->of($organizationId);
        $limit = $plan->professionalLimit();

        if ($limit === null) {
            return;
        }

        $active = $this->activeProfessionals($organizationId);

        if ($active > $limit) {
            throw new PlanProfessionalLimitExceededException($organizationId, $plan, $limit, $active);
        }
    }

    /**
     * In the organization's timezone: the unit of the monthly appointment limit.
     */
    public function monthOf(int $organizationId, CarbonImmutable $at): CarbonImmutable
    {
        /** @var string $timezone */
        $timezone = Organization::query()->whereKey($organizationId)->value('timezone') ?? config('app.timezone');

        return $at->setTimezone($timezone)->startOfMonth();
    }

    /**
     * Counted by start date, not booking date; cancelled and rescheduled ones free their place.
     */
    public function appointmentsInMonth(int $organizationId, CarbonImmutable $month): int
    {
        /** @var string $storageTimezone */
        $storageTimezone = config('app.timezone');

        return Appointment::withoutGlobalScope('organization')
            ->where('organization_id', $organizationId)
            ->whereNotIn('status', [AppointmentStatus::Cancelled, AppointmentStatus::Rescheduled])
            ->where('start_at', '>=', $month->setTimezone($storageTimezone))
            ->where('start_at', '<', $month->addMonth()->setTimezone($storageTimezone))
            ->count();
    }

    /**
     * Not race-safe on its own: BookAppointmentAction calls it under the organization's lock.
     *
     * @throws PlanAppointmentLimitReachedException
     */
    public function ensureWithinAppointmentLimit(int $organizationId, Plan $plan, CarbonImmutable $startAt): void
    {
        $limit = $plan->monthlyAppointmentLimit();

        if ($limit === null) {
            return;
        }

        $month = $this->monthOf($organizationId, $startAt);

        if ($this->appointmentsInMonth($organizationId, $month) >= $limit) {
            throw new PlanAppointmentLimitReachedException($organizationId, $plan, $limit, $month->format('Y-m'));
        }
    }
}
