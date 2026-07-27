<?php

declare(strict_types=1);

namespace App\Data\Availability;

use App\Contracts\Data;

final readonly class AvailabilitySlotData implements Data
{
    public function __construct(
        public ?int $availabilityId,
        public int $organizationId,
        public int $membershipId,
        public int $dayOfWeek,
        public string $startTime,
        public string $endTime,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'availabilityId' => $this->availabilityId,
            'organizationId' => $this->organizationId,
            'membershipId' => $this->membershipId,
            'dayOfWeek' => $this->dayOfWeek,
            'startTime' => $this->startTime,
            'endTime' => $this->endTime,
        ];
    }
}
