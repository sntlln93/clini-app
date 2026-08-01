<?php

declare(strict_types=1);

namespace App\Data\Booking;

use App\Contracts\Data;
use Carbon\CarbonImmutable;

final readonly class SlotAvailabilityCheckData implements Data
{
    public function __construct(
        public int $organizationId,
        public int $membershipId,
        public CarbonImmutable $startAt,
        public int $durationMinutes,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'organizationId' => $this->organizationId,
            'membershipId' => $this->membershipId,
            'startAt' => $this->startAt,
            'durationMinutes' => $this->durationMinutes,
        ];
    }
}
