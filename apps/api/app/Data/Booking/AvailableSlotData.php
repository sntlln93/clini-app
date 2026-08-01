<?php

declare(strict_types=1);

namespace App\Data\Booking;

use App\Contracts\Data;
use Carbon\CarbonImmutable;

final readonly class AvailableSlotData implements Data
{
    public function __construct(
        public CarbonImmutable $startAt,
        public CarbonImmutable $endAt,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'startAt' => $this->startAt,
            'endAt' => $this->endAt,
        ];
    }
}
