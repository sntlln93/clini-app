<?php

declare(strict_types=1);

namespace App\Data\Reports;

use App\Contracts\Data;
use App\Enums\ReportGranularity;

final readonly class ReportPeriodData implements Data
{
    /**
     * @param  string  $fromDate  first local calendar day, Y-m-d
     * @param  string  $toDate  last local calendar day (inclusive), Y-m-d
     * @param  int|null  $membershipId  one professional, or null for the whole organization
     */
    public function __construct(
        public int $organizationId,
        public string $timezone,
        public string $fromDate,
        public string $toDate,
        public ReportGranularity $granularity,
        public ?int $membershipId,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'organizationId' => $this->organizationId,
            'timezone' => $this->timezone,
            'fromDate' => $this->fromDate,
            'toDate' => $this->toDate,
            'granularity' => $this->granularity->value,
            'membershipId' => $this->membershipId,
        ];
    }
}
