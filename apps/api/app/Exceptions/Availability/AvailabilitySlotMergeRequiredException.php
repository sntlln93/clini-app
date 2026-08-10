<?php

declare(strict_types=1);

namespace App\Exceptions\Availability;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * Thrown when a weekly availability slot overlaps or is adjacent to one or
 * more existing slots of the same membership+day_of_week and the caller has
 * not opted in to merging them (`SaveAvailabilitySlotAction`).
 */
final class AvailabilitySlotMergeRequiredException extends DomainException
{
    /**
     * @param  array{start: string, end: string}  $merged
     * @param  list<array{start: string, end: string}>  $absorbed
     */
    public function __construct(
        private readonly int $membershipId,
        private readonly int $dayOfWeek,
        private readonly array $merged,
        private readonly array $absorbed,
    ) {
        parent::__construct('The availability slot overlaps or is adjacent to another slot for the same day.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::AvailabilitySlotMergeRequired;
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
            'merged' => $this->merged,
            'absorbed' => $this->absorbed,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function publicContext(): array
    {
        return [
            'merged' => $this->merged,
            'absorbed' => $this->absorbed,
        ];
    }
}
