<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Data\Admin\PlatformStatsData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin PlatformStatsData
 */
class PlatformStatsResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var PlatformStatsData $stats */
        $stats = $this->resource;

        return [
            'period' => $stats->period,
            'appointments' => $stats->appointments,
            'patients' => $stats->patients,
            'reminders' => $stats->reminders,
        ];
    }
}
