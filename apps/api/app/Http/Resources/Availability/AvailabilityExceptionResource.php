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
            // Backed enums and Carbon instances both serialize to their
            // scalar/ISO 8601 string form natively on json_encode(), so
            // these are returned as-is rather than via ->value/->format().
            'type' => $availabilityException->type,
            'start_at' => $availabilityException->start_at,
            'end_at' => $availabilityException->end_at,
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
