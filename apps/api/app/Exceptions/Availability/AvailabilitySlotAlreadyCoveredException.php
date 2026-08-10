<?php

declare(strict_types=1);

namespace App\Exceptions\Availability;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * Thrown when a weekly availability slot is fully contained within an
 * existing slot of the same membership+day_of_week — nothing changes
 * (`SaveAvailabilitySlotAction`).
 */
final class AvailabilitySlotAlreadyCoveredException extends DomainException
{
    /**
     * @param  array{start: string, end: string}  $covering
     */
    public function __construct(
        private readonly int $membershipId,
        private readonly int $dayOfWeek,
        private readonly array $covering,
    ) {
        parent::__construct('The availability slot is already covered by another slot for the same day.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::AvailabilitySlotAlreadyCovered;
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
            'day_of_week' => $this->dayOfWeek,
            'covering' => $this->covering,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function publicContext(): array
    {
        return [
            'covering' => $this->covering,
        ];
    }
}
