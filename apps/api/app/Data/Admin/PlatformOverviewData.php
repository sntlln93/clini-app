<?php

declare(strict_types=1);

namespace App\Data\Admin;

use App\Contracts\Data;

/**
 * Output of ComputePlatformOverviewAction; `kpis`/`series` follow the REST contract shape verbatim.
 */
final readonly class PlatformOverviewData implements Data
{
    /**
     * @param  array<string, array<string, int|string>>  $kpis
     * @param  array<string, mixed>  $series
     * @param  array<int, PlatformActivityData>  $recentActivity
     */
    public function __construct(
        public array $kpis,
        public array $series,
        public array $recentActivity,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'kpis' => $this->kpis,
            'series' => $this->series,
            'recentActivity' => $this->recentActivity,
        ];
    }
}
