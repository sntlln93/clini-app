<?php

declare(strict_types=1);

namespace App\Actions\Appointments;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Appointments\AppointmentBookingData;
use App\Data\Appointments\AppointmentReschedulingData;
use App\Enums\AppointmentOrigin;
use App\Enums\AppointmentStatus;
use App\Enums\ReminderStatus;
use App\Exceptions\Appointments\AppointmentNotReschedulableException;
use App\Models\Appointment;
use Illuminate\Support\Facades\DB;

/**
 * Reuses `BookAppointmentAction` for the new appointment. Critical order:
 * the original is marked `rescheduled` before `BookAppointmentAction` runs
 * — otherwise, if the new time overlaps the old one, the original's own row
 * would trip the overlap check inside `BookAppointmentAction`. Both writes
 * happen inside a single transaction, so a domain exception from
 * `BookAppointmentAction` (overlap / inactive service) rolls back the
 * original's status change too.
 *
 * @implements Action<AppointmentReschedulingData>
 */
class RescheduleAppointmentAction implements Action
{
    /**
     * @var list<AppointmentStatus>
     */
    private const array RESCHEDULABLE_STATUSES = [
        AppointmentStatus::Scheduled,
        AppointmentStatus::Confirmed,
    ];

    public function __construct(
        private readonly BookAppointmentAction $bookAppointmentAction,
    ) {}

    /**
     * @param  AppointmentReschedulingData  $dto
     */
    public function handle(Data $dto): Appointment
    {
        return DB::transaction(function () use ($dto): Appointment {
            $original = Appointment::query()->findOrFail($dto->appointmentId);

            /** @var AppointmentStatus $currentStatus */
            $currentStatus = $original->status;

            if (! in_array($currentStatus, self::RESCHEDULABLE_STATUSES, true)) {
                throw new AppointmentNotReschedulableException($dto->appointmentId, $currentStatus);
            }

            $original->update(['status' => AppointmentStatus::Rescheduled]);

            $original->reminders()->where('status', ReminderStatus::Pending)->delete();

            /** @var AppointmentOrigin $originalOrigin */
            $originalOrigin = $original->origin;

            return $this->bookAppointmentAction->handle(new AppointmentBookingData(
                organizationId: $original->organization_id,
                membershipId: $original->membership_id,
                patientId: $original->patient_id,
                serviceId: $original->service_id,
                createdBy: $dto->rescheduledBy,
                startAt: $dto->startAt,
                origin: $originalOrigin,
                reason: $dto->reason ?? $original->reason,
                notes: $dto->notes ?? $original->notes,
                rescheduledFromId: $original->id,
            ));
        });
    }
}
