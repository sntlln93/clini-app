<?php

declare(strict_types=1);

namespace App\Exceptions\Availability;

use App\Enums\AvailabilityExceptionType;
use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * Thrown when an availability exception strictly overlaps an existing
 * exception of the same organization+membership_id but a different `type` —
 * cross-type collisions never merge, adjacency is not an error
 * (`SaveAvailabilityExceptionAction`).
 */
final class AvailabilityExceptionTypeConflictException extends DomainException
{
    public function __construct(
        private readonly ?int $membershipId,
        private readonly AvailabilityExceptionType $existingType,
    ) {
        parent::__construct('The availability exception overlaps an existing exception of a different type.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::AvailabilityExceptionTypeConflict;
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
            'existing_type' => $this->existingType->value,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function publicContext(): array
    {
        return [
            'existing_type' => $this->existingType->value,
        ];
    }
}
