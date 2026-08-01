<?php

declare(strict_types=1);

namespace App\Data\Booking;

use App\Contracts\Data;
use Carbon\CarbonImmutable;

final readonly class PublishedDayIntervalsData implements Data
{
    public function __construct(
        public int $membershipId,
        public CarbonImmutable $day,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'membershipId' => $this->membershipId,
            'day' => $this->day,
        ];
    }
}
