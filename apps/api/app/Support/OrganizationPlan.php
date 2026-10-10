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
 * Resolves an organization's plan (Plan::resolve) and enforces it on the
 * server (#237). Reads bypass the tenant scope, so it serves the public
 * booking routes and the invitation acceptance too, which have no current
 * organization of their own.
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
     * Rejects a membership becoming active with roles the plan leaves out:
     * owner, admin or staff without the Team feature, or a professional
     * past the plan's limit. Callers pass only the roles the membership
     * gains, so a downgraded organization can still edit what it has.
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
     * Start of the calendar month holding `$at`, in the organization's
     * timezone: the unit of the monthly appointment limit (#238).
     */
    public function monthOf(int $organizationId, CarbonImmutable $at): CarbonImmutable
    {
        /** @var string $timezone */
        $timezone = Organization::query()->whereKey($organizationId)->value('timezone') ?? config('app.timezone');

        return $at->setTimezone($timezone)->startOfMonth();
    }

    /**
     * Appointments starting within the month, counted by their date
     * rather than by when they were booked. Cancelled and rescheduled ones
     * free their place, as they free their slot (ADR 0004).
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
     * Not race-safe on its own: BookAppointmentAction calls it under the
     * organization's lock.
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
