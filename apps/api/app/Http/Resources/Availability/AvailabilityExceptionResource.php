<?php

declare(strict_types=1);

namespace App\Http\Resources\Availability;

use App\Models\AvailabilityException;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AvailabilityException
 */
class AvailabilityExceptionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $availabilityException = $this->availabilityException();

        return [
            'id' => $availabilityException->id,
            'membership_id' => $availabilityException->membership_id,
            'type' => $availabilityException->type->value,
            'start_at' => $availabilityException->start_at?->toIso8601String(),
            'end_at' => $availabilityException->end_at?->toIso8601String(),
            'reason' => $availabilityException->reason,
        ];
    }

    private function availabilityException(): AvailabilityException
    {
        /** @var AvailabilityException $availabilityException */
        $availabilityException = $this->resource;

        return $availabilityException;
    }
}
