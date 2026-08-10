<?php

declare(strict_types=1);

namespace App\Data\Availability;

use App\Contracts\Data;
use App\Enums\AvailabilityExceptionType;

final readonly class AvailabilityExceptionData implements Data
{
    public function __construct(
        public ?int $availabilityExceptionId,
        public int $organizationId,
        public ?int $membershipId,
        public AvailabilityExceptionType $type,
        public string $startAt,
        public string $endAt,
        public ?string $reason,
        public bool $merge,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'availabilityExceptionId' => $this->availabilityExceptionId,
            'organizationId' => $this->organizationId,
            'membershipId' => $this->membershipId,
            'type' => $this->type,
            'startAt' => $this->startAt,
            'endAt' => $this->endAt,
            'reason' => $this->reason,
            'merge' => $this->merge,
        ];
    }
}
