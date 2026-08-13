<?php

declare(strict_types=1);

namespace App\Data\Holidays;

use App\Contracts\Data;
use Carbon\CarbonImmutable;

final readonly class HolidayData implements Data
{
    public function __construct(
        public CarbonImmutable $date,
        public string $name,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'date' => $this->date,
            'name' => $this->name,
        ];
    }
}
