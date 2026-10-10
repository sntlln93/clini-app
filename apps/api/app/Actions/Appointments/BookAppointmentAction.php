<?php

declare(strict_types=1);

namespace App\Actions\Appointments;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Appointments\AppointmentBookingData;
use App\Enums\AppointmentStatus;
use App\Enums\Plan;
use App\Events\Appointments\AppointmentBooked;
use App\Exceptions\Appointments\ServiceNotActiveForProfessionalException;
use App\Exceptions\Appointments\SlotTakenException;
use App\Models\Appointment;
use App\Models\AppointmentLimitWarning;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\ProfessionalService;
use App\Notifications\Plans\AppointmentLimitApproachingNotification;
use App\Support\OrganizationPlan;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

/**
 * Single write path for appointments (ADR 0004): locks the physical
 * professional, not the membership, so the check is correct across organizations.
 * On a plan with a monthly appointment limit (#238) it also locks the
 * organization, since the count spans every professional in it; the two
 * locks are always taken in this order.
 *
 * @implements Action<AppointmentBookingData>
 */
class BookAppointmentAction implements Action
{
    private const int LOCK_NAMESPACE = 24;

    private const int ORGANIZATION_LOCK_NAMESPACE = 25;

    public function __construct(
        private readonly OrganizationPlan $plans,
    ) {}

    /**
     * @param  AppointmentBookingData  $dto
     */
    public function handle(Data $dto): Appointment
    {
        $warning = null;

        $appointment = DB::transaction(function () use ($dto, &$warning): Appointment {
            $membership = Membership::withoutGlobalScope('organization')->findOrFail($dto->membershipId);
            $userId = $membership->user_id;

            // Must run before any read: serialises concurrent bookings for the same physical professional, across organizations.
            DB::statement('select pg_advisory_xact_lock(?, ?)', [self::LOCK_NAMESPACE, $userId]);

            $plan = $this->plans->of($dto->organizationId);
            $limited = $plan->monthlyAppointmentLimit() !== null;

            if ($limited) {
                DB::statement('select pg_advisory_xact_lock(?, ?)', [self::ORGANIZATION_LOCK_NAMESPACE, $dto->organizationId]);
            }

            $professionalService = ProfessionalService::withoutGlobalScope('organization')
                ->where('membership_id', $dto->membershipId)
                ->where('service_id', $dto->serviceId)
                ->where('active', true)
                ->first();

            if ($professionalService === null) {
                throw new ServiceNotActiveForProfessionalException($dto->membershipId, $dto->serviceId);
            }

            $endAt = $dto->startAt->addMinutes($professionalService->duration_minutes);

            $membershipIds = Membership::withoutGlobalScope('organization')
                ->where('user_id', $userId)
                ->pluck('id');

            $hasOverlap = Appointment::query()
                ->withoutGlobalScope('organization')
                ->whereIn('membership_id', $membershipIds)
                ->whereNotIn('status', [AppointmentStatus::Cancelled, AppointmentStatus::Rescheduled])
                ->where('start_at', '<', $endAt)
                ->where('end_at', '>', $dto->startAt)
                ->exists();

            if ($hasOverlap) {
                throw new SlotTakenException($dto->membershipId, $dto->startAt, $endAt);
            }

            if ($limited && ! $this->staysInOriginalMonth($dto)) {
                $this->plans->ensureWithinAppointmentLimit($dto->organizationId, $plan, $dto->startAt);
            }

            $appointment = Appointment::create([
                'organization_id' => $dto->organizationId,
                'membership_id' => $dto->membershipId,
                'patient_id' => $dto->patientId,
                'service_id' => $dto->serviceId,
                'created_by' => $dto->createdBy,
                'origin' => $dto->origin,
                'status' => AppointmentStatus::Scheduled,
                'start_at' => $dto->startAt,
                'end_at' => $endAt,
                'reason' => $dto->reason,
                'notes' => $dto->notes,
                'rescheduled_from_id' => $dto->rescheduledFromId,
            ]);

            if ($limited) {
                $warning = $this->claimLimitWarning($dto->organizationId, $plan, $dto->startAt);
            }

            return $appointment;
        });

        AppointmentBooked::dispatch($appointment);

        if ($warning !== null) {
            // Deferred until the outermost commit: a reschedule wraps this in its own transaction.
            DB::afterCommit(function () use ($warning, $dto): void {
                $organization = Organization::query()->findOrFail($dto->organizationId);

                Notification::send($organization->ownerUsers(), new AppointmentLimitApproachingNotification(
                    $organization,
                    ...$warning,
                ));
            });
        }

        return $appointment;
    }

    /**
     * A reschedule within the original's month never adds to it, so it
     * passes even when the month is already over the limit (e.g. after a
     * downgrade to Free).
     */
    private function staysInOriginalMonth(AppointmentBookingData $dto): bool
    {
        if ($dto->rescheduledFromId === null) {
            return false;
        }

        $original = Appointment::withoutGlobalScope('organization')->find($dto->rescheduledFromId, ['id', 'start_at']);

        return $original !== null
            && $this->plans->monthOf($dto->organizationId, $original->start_at->toImmutable())
                ->equalTo($this->plans->monthOf($dto->organizationId, $dto->startAt));
    }

    /**
     * Claims the month's warning once its count reaches the threshold. The
     * unique (organization, month) row makes it once per month even if the
     * count later drops and climbs back.
     *
     * @return array{month: CarbonImmutable, appointments: int, appointmentLimit: int}|null
     */
    private function claimLimitWarning(int $organizationId, Plan $plan, CarbonImmutable $startAt): ?array
    {
        $threshold = $plan->appointmentWarningThreshold();
        $limit = $plan->monthlyAppointmentLimit();

        if ($threshold === null || $limit === null) {
            return null;
        }

        $month = $this->plans->monthOf($organizationId, $startAt);
        $appointments = $this->plans->appointmentsInMonth($organizationId, $month);

        if ($appointments < $threshold) {
            return null;
        }

        $claimed = AppointmentLimitWarning::query()->insertOrIgnore([
            'organization_id' => $organizationId,
            'month' => $month->toDateString(),
        ]);

        return $claimed === 1
            ? ['month' => $month, 'appointments' => $appointments, 'appointmentLimit' => $limit]
            : null;
    }
}
