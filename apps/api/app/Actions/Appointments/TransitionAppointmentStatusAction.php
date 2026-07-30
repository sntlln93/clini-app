<?php

declare(strict_types=1);

namespace App\Actions\Appointments;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Appointments\AppointmentStatusTransitionData;
use App\Enums\AppointmentStatus;
use App\Exceptions\Appointments\StatusTransitionNotAllowedException;
use App\Models\Appointment;

/**
 * @implements Action<AppointmentStatusTransitionData>
 */
class TransitionAppointmentStatusAction implements Action
{
    /**
     * @param  AppointmentStatusTransitionData  $dto
     */
    public function handle(Data $dto): Appointment
    {
        $appointment = Appointment::query()->findOrFail($dto->appointmentId);

        /** @var AppointmentStatus $currentStatus */
        $currentStatus = $appointment->status;

        if (! $currentStatus->canTransitionTo($dto->status)) {
            throw new StatusTransitionNotAllowedException($dto->appointmentId, $currentStatus, $dto->status);
        }

        $attributes = ['status' => $dto->status];

        $attributes = match ($dto->status) {
            AppointmentStatus::Confirmed => [...$attributes, 'confirmed_at' => now()],
            AppointmentStatus::Arrived => [...$attributes, 'arrived_at' => now()],
            AppointmentStatus::Completed => [...$attributes, 'completed_at' => now()],
            default => $attributes,
        };

        $appointment->update($attributes);

        return $appointment;
    }
}
