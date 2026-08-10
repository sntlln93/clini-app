<?php

declare(strict_types=1);

namespace App\Exceptions\Availability;

use App\Enums\AvailabilityExceptionType;
use App\Enums\ErrorCode;
use App\Exceptions\DomainException;
use Carbon\Carbon;

/**
 * Thrown when an availability exception overlaps or is adjacent to one or
 * more existing exceptions of the same organization+membership_id and
 * `type`, and the caller has not opted in to merging them
 * (`SaveAvailabilityExceptionAction`). `start`/`end` are the same Carbon
 * instances `AvailabilityExceptionResource` emits for `start_at`/`end_at`,
 * so they serialize identically.
 */
final class AvailabilityExceptionMergeRequiredException extends DomainException
{
    /**
     * @param  array{start: Carbon, end: Carbon}  $merged
     * @param  list<array{start: Carbon, end: Carbon}>  $absorbed
     */
    public function __construct(
        private readonly ?int $membershipId,
        private readonly AvailabilityExceptionType $type,
        private readonly array $merged,
        private readonly array $absorbed,
    ) {
        parent::__construct('The availability exception overlaps or is adjacent to another exception of the same type.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::AvailabilityExceptionMergeRequired;
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
