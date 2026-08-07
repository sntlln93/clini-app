<?php

declare(strict_types=1);

namespace App\Http\Resources\Booking;

use App\Models\Appointment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Minimal confirmation shape for an anonymous consumer — never
 * AppointmentResource, which would leak internal patient/appointment
 * data to the public.
 *
 * @mixin Appointment
 */
class BookingConfirmationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $appointment = $this->appointment();

        return [
            'start_at' => $appointment->start_at,
            'end_at' => $appointment->end_at,
            'professional_name' => $appointment->membership?->user?->name,
            'service_name' => $appointment->service?->name,
            'organization_name' => $appointment->organization?->name,
        ];
    }

    private function appointment(): Appointment
    {
        /** @var Appointment $appointment */
        $appointment = $this->resource;

        return $appointment;
    }
}
