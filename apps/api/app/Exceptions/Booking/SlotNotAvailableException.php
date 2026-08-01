<?php

declare(strict_types=1);

namespace App\Exceptions\Booking;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;
use Carbon\CarbonImmutable;

/**
 * Thrown when a public booking request targets a time that isn't among the
 * slots ListAvailableSlotsAction currently publishes for that day — the
 * professional's published availability changed (or the slot was taken)
 * between the client fetching the grid and submitting the booking.
 */
final class SlotNotAvailableException extends DomainException
{
    public function __construct(
        private readonly int $membershipId,
        private readonly CarbonImmutable $startAt,
    ) {
        parent::__construct('The requested slot is not among the professional\'s published availability.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::BookingSlotNotAvailable;
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
        ];
    }
}
