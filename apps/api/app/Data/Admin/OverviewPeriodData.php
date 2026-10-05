<?php

declare(strict_types=1);

namespace App\Data\Admin;

use App\Contracts\Data;

/**
 * The last `days` local days, today included, in `timezone`.
 */
final readonly class OverviewPeriodData implements Data
{
    public function __construct(
        public int $days,
        public string $timezone,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'days' => $this->days,
            'timezone' => $this->timezone,
        ];
    }
}
