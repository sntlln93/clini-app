<?php

declare(strict_types=1);

namespace App\Data\Reports;

use App\Contracts\Data;

/**
 * Output of ComputeOrganizationReportAction; each section follows the REST contract shape verbatim.
 */
final readonly class OrganizationReportData implements Data
{
    /**
     * @param  array<string, mixed>  $period
     * @param  array<int, array<string, mixed>>  $professionals
     * @param  array<int, array<string, mixed>>  $series
     * @param  array<string, int>  $origin
     * @param  array<string, mixed>|null  $newPatients  null when the report covers a single professional
     */
    public function __construct(
        public array $period,
        public array $professionals,
        public array $series,
        public array $origin,
        public ?array $newPatients,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'period' => $this->period,
            'professionals' => $this->professionals,
            'series' => $this->series,
            'origin' => $this->origin,
            'new_patients' => $this->newPatients,
        ];
    }
}
