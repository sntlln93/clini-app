<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Data\Admin\PlatformActivityData;
use App\Data\Admin\PlatformOverviewData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin PlatformOverviewData
 */
class PlatformOverviewResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var PlatformOverviewData $overview */
        $overview = $this->resource;

        return [
            'kpis' => $overview->kpis,
            'series' => $overview->series,
            'recent_activity' => array_map(fn (PlatformActivityData $activity): array => [
                'kind' => $activity->kind,
                'occurred_at' => $activity->occurredAt->toIso8601String(),
                'subject' => [
                    'type' => $activity->subjectType,
                    'id' => $activity->subjectId,
                    'label' => $activity->subjectLabel,
                ],
                'detail' => $activity->detail,
            ], $overview->recentActivity),
        ];
    }
}
