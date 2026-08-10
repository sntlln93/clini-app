<?php

declare(strict_types=1);

namespace App\Exceptions\Availability;

use App\Enums\AvailabilityExceptionType;
use App\Enums\ErrorCode;
use App\Exceptions\DomainException;
use Illuminate\Support\Carbon;

/**
 * Thrown when an availability exception is fully contained within an
 * existing exception of the same organization+membership_id and `type` —
 * nothing changes (`SaveAvailabilityExceptionAction`). `start`/`end` are the
 * same Carbon instances `AvailabilityExceptionResource` emits for
 * `start_at`/`end_at`, so they serialize identically.
 */
final class AvailabilityExceptionAlreadyCoveredException extends DomainException
{
    /**
     * @param  array{start: Carbon, end: Carbon}  $covering
     */
    public function __construct(
        private readonly ?int $membershipId,
        private readonly AvailabilityExceptionType $type,
        private readonly array $covering,
    ) {
        parent::__construct('The availability exception is already covered by another exception of the same type.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::AvailabilityExceptionAlreadyCovered;
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
            'type' => $this->type->value,
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
