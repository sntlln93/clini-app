<?php

declare(strict_types=1);

namespace App\Exceptions\Appointments;

use App\Enums\AppointmentStatus;
use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * Thrown when an appointment status transition is not allowed
 * (`TransitionAppointmentStatusAction`).
 */
final class StatusTransitionNotAllowedException extends DomainException
{
    public function __construct(
        private readonly int $appointmentId,
        private readonly AppointmentStatus $fromStatus,
        private readonly AppointmentStatus $toStatus,
    ) {
        parent::__construct('This status transition is not allowed.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::AppointmentsStatusTransitionNotAllowed;
    }

    public function httpStatus(): int
    {
        return 409;
    }

    /**
     * @return array<string, mixed>
     */
    public function logContext(): array
    {
        return [
            'appointment_id' => $this->appointmentId,
            'from_status' => $this->fromStatus->value,
            'to_status' => $this->toStatus->value,
        ];
    }
}
