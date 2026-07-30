<?php

declare(strict_types=1);

namespace App\Actions\Appointments;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Appointments\AppointmentBookingData;
use App\Enums\AppointmentStatus;
use App\Exceptions\Appointments\ServiceNotActiveForProfessionalException;
use App\Exceptions\Appointments\SlotTakenException;
use App\Models\Appointment;
use App\Models\Membership;
use App\Models\ProfessionalService;
use Illuminate\Support\Facades\DB;

/**
 * The single write path for appointments (ADR 0004): derives the duration
 * from the professional's service configuration, takes an advisory lock on
 * the physical professional (not the membership, so the check is correct
 * across organizations), checks for overlap and creates the row — all
 * inside one transaction.
 *
 * @implements Action<AppointmentBookingData>
 */
class BookAppointmentAction implements Action
{
    private const int LOCK_NAMESPACE = 24;

    /**
     * @param  AppointmentBookingData  $dto
     */
    public function handle(Data $dto): Appointment
    {
        return DB::transaction(function () use ($dto): Appointment {
            $membership = Membership::withoutGlobalScope('organization')->findOrFail($dto->membershipId);
            $userId = $membership->user_id;

            // Must run before any read: serialises concurrent bookings for
            // the same physical professional, across organizations.
            DB::statement('select pg_advisory_xact_lock(?, ?)', [self::LOCK_NAMESPACE, $userId]);

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

            return Appointment::create([
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
        });
    }
}
