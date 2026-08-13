<?php

declare(strict_types=1);

namespace App\Http\Resources\Patients;

use App\Http\Resources\Appointments\AppointmentResource;
use App\Models\Appointment;
use App\Models\Membership;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * Shapes one item of a patient's appointment history (`pacientes/{id}`):
 * extends AppointmentResource to reuse its field shaping (service,
 * professional, status, …) instead of duplicating it, adding only what
 * the history view needs on top — the organization name and whether the
 * appointment belongs to the acting membership.
 *
 * @mixin Appointment
 */
class PatientAppointmentResource extends AppointmentResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $appointment = $this->appointment();

        /** @var User|null $user */
        $user = $request->user();
        $membership = $user?->currentMembership();

        return array_merge(parent::toArray($request), [
            'organization_name' => $this->whenLoaded('organization', fn () => $appointment->organization?->name),
            'is_own_membership' => $membership instanceof Membership && $appointment->membership_id === $membership->id,
        ]);
    }

    private function appointment(): Appointment
    {
        /** @var Appointment $appointment */
        $appointment = $this->resource;

        return $appointment;
    }
}
