<?php

declare(strict_types=1);

namespace App\Exceptions\Booking;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * Thrown by AppointmentDetailsLink when a details link shows nothing: it
 * doesn't decrypt, or its appointment ended, was cancelled or rescheduled.
 * One answer for all of them, so a forged link learns nothing.
 */
final class BookingAppointmentUnavailableException extends DomainException
{
    public function __construct(
        private readonly ?int $appointmentId,
    ) {
        parent::__construct('No appointment details are available for this link.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::BookingAppointmentUnavailable;
    }

    public function httpStatus(): int
    {
        return 404;
    }

    /**
     * Never the token: it is the link's only credential.
     *
     * @return array<string, mixed>
     */
    public function logContext(): array
    {
        return [
            'appointment_id' => $this->appointmentId,
        ];
    }
}
