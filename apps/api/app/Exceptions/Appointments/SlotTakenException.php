<?php

declare(strict_types=1);

namespace App\Exceptions\Appointments;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;
use Carbon\CarbonImmutable;

/**
 * Thrown when a booking overlaps an existing appointment for the same
 * physical professional (`BookAppointmentAction`).
 */
final class SlotTakenException extends DomainException
{
    public function __construct(
        private readonly int $membershipId,
        private readonly CarbonImmutable $startAt,
        private readonly CarbonImmutable $endAt,
    ) {
        parent::__construct('The professional already has an appointment at that time.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::AppointmentsSlotTaken;
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
            'membership_id' => $this->membershipId,
            'start_at' => $this->startAt->toIso8601String(),
            'end_at' => $this->endAt->toIso8601String(),
        ];
    }
}
