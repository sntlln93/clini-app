<?php

declare(strict_types=1);

namespace App\Http\Resources\Availability;

use App\Models\Availability;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Availability
 */
class AvailabilityResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $availability = $this->availability();

        return [
            'id' => $availability->id,
            'membership_id' => $availability->membership_id,
            'day_of_week' => $availability->day_of_week,
            'start_time' => substr((string) $availability->start_time, 0, 5),
            'end_time' => substr((string) $availability->end_time, 0, 5),
        ];
    }

    private function availability(): Availability
    {
        /** @var Availability $availability */
        $availability = $this->resource;

        return $availability;
    }
}
