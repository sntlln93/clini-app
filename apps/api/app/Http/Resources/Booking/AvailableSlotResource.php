<?php

declare(strict_types=1);

namespace App\Http\Resources\Booking;

use App\Data\Booking\AvailableSlotData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AvailableSlotData
 */
class AvailableSlotResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $slot = $this->slot();

        return [
            'start_at' => $slot->startAt,
            'end_at' => $slot->endAt,
        ];
    }

    private function slot(): AvailableSlotData
    {
        /** @var AvailableSlotData $slot */
        $slot = $this->resource;

        return $slot;
    }
}
