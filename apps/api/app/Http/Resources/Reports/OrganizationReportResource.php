<?php

declare(strict_types=1);

namespace App\Http\Resources\Reports;

use App\Data\Reports\OrganizationReportData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin OrganizationReportData
 */
class OrganizationReportResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var OrganizationReportData $report */
        $report = $this->resource;

        return $report->toArray();
    }
}
