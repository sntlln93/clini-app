<?php

declare(strict_types=1);

namespace App\Data\Holidays;

use App\Contracts\Data;

final readonly class HolidaySyncData implements Data
{
    public function __construct(
        public int $organizationId,
        public int $year,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'organizationId' => $this->organizationId,
            'year' => $this->year,
        ];
    }
}
