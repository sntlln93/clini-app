<?php

declare(strict_types=1);

namespace App\Actions\Appointments;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Appointments\AppointmentCancellationData;
use App\Enums\AppointmentStatus;
use App\Exceptions\Appointments\AppointmentNotCancellableException;
use App\Models\Appointment;

/**
 * Cancellation is not modeled through
 * `AppointmentStatus::allowedTransitions()` (Cancelled is terminal there),
 * so this action validates its own allowed source statuses instead of using
 * `canTransitionTo()`.
 *
 * @implements Action<AppointmentCancellationData>
 */
class CancelAppointmentAction implements Action
{
    /**
     * @var list<AppointmentStatus>
     */
    private const array CANCELLABLE_STATUSES = [
        AppointmentStatus::Scheduled,
        AppointmentStatus::Confirmed,
        AppointmentStatus::Arrived,
    ];

    /**
     * @param  AppointmentCancellationData  $dto
     */
    public function handle(Data $dto): Appointment
    {
        $appointment = Appointment::query()->findOrFail($dto->appointmentId);

        /** @var AppointmentStatus $currentStatus */
        $currentStatus = $appointment->status;

        if (! in_array($currentStatus, self::CANCELLABLE_STATUSES, true)) {
            throw new AppointmentNotCancellableException($dto->appointmentId, $currentStatus);
        }

        $appointment->update([
            'status' => AppointmentStatus::Cancelled,
            'cancelled_at' => now(),
            'cancelled_by' => $dto->cancelledBy,
            'cancellation_reason' => $dto->cancellationReason,
        ]);

        return $appointment;
    }
}
