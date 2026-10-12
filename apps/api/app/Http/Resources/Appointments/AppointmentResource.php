<?php

declare(strict_types=1);

namespace App\Http\Resources\Appointments;

use App\Models\Appointment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Appointment
 */
class AppointmentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $appointment = $this->appointment();

        return [
            'id' => $appointment->id,
            'membership_id' => $appointment->membership_id,
            'patient_id' => $appointment->patient_id,
            'service_id' => $appointment->service_id,
            // Backed enums and Carbon instances serialize natively on json_encode(), so these are returned as-is.
            'status' => $appointment->status,
            'origin' => $appointment->origin,
            'start_at' => $appointment->start_at,
            'end_at' => $appointment->end_at,
            'arrived_at' => $appointment->arrived_at,
            'reason' => $appointment->reason,
            'notes' => $appointment->notes,
            'cancelled_at' => $appointment->cancelled_at,
            'cancellation_reason' => $appointment->cancellation_reason,
            'rescheduled_from_id' => $appointment->rescheduled_from_id,
            // What the patient reported when booking online (#291); the patient's own record may differ.
            'reported_insurance_provider_id' => $appointment->reported_insurance_provider_id,
            'reported_insurance_member_number' => $appointment->reported_insurance_member_number,
            'reported_insurance_provider_name' => $this->whenLoaded('reportedInsuranceProvider', fn () => $appointment->reportedInsuranceProvider?->name),
            'professional_name' => $this->whenLoaded('membership', fn () => $appointment->membership?->user?->name),
            'patient_name' => $this->whenLoaded('patient', fn () => $appointment->patient?->name),
            'service_name' => $this->whenLoaded('service', fn () => $appointment->service?->name),
        ];
    }

    private function appointment(): Appointment
    {
        /** @var Appointment $appointment */
        $appointment = $this->resource;

        return $appointment;
    }
}
