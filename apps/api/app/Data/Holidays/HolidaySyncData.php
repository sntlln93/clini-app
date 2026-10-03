<?php

declare(strict_types=1);

namespace App\Data\Holidays;

use App\Contracts\Data;
use App\Enums\Province;

/**
 * One catalog scope to sync for a year: national when `province` is null,
 * that province's own holidays otherwise.
 */
final readonly class HolidaySyncData implements Data
{
    public function __construct(
        public int $year,
        public ?Province $province,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'year' => $this->year,
            'province' => $this->province,
        ];
    }
}
