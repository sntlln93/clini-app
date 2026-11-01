<?php

declare(strict_types=1);

namespace App\Data\Availability;

use App\Contracts\Data;

/**
 * One weekly franja: a day of the week (0 = Sunday … 6 = Saturday) and its
 * clock times (`H:i`) in the practice's zone.
 */
final readonly class AvailabilitySlotData implements Data
{
    public function __construct(
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
            'dayOfWeek' => $this->dayOfWeek,
            'startTime' => $this->startTime,
            'endTime' => $this->endTime,
        ];
    }
}
