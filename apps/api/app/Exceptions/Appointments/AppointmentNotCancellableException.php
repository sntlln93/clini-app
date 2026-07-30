<?php

declare(strict_types=1);

namespace App\Exceptions\Appointments;

use App\Enums\AppointmentStatus;
use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * Thrown when cancelling an appointment that is not in a cancellable
 * status (`CancelAppointmentAction`).
 */
final class AppointmentNotCancellableException extends DomainException
{
    public function __construct(
        private readonly int $appointmentId,
        private readonly AppointmentStatus $currentStatus,
    ) {
        parent::__construct('This appointment cannot be cancelled from its current status.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::AppointmentsNotCancellableFromStatus;
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
            'status' => $this->currentStatus->value,
        ];
    }
}
