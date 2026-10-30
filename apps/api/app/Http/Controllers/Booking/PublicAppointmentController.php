<?php

declare(strict_types=1);

namespace App\Http\Controllers\Booking;

use App\Http\Controllers\Controller;
use App\Http\Resources\Booking\BookingConfirmationResource;
use App\Http\Resources\Booking\PublicOrganizationResource;
use App\Models\PatientAccessCode;
use App\Support\AppointmentDetailsLink;
use App\Support\CurrentOrganization;
use Illuminate\Http\JsonResponse;

/**
 * Fully public, like the booking page: the link the reminder carries (#320)
 * is the only credential. Shows the booking confirmation's shape, which
 * never includes the patient, and the appointment's access code (#364, ADR
 * 0029), the same one the patient was mailed, while it is still unredeemed.
 */
class PublicAppointmentController extends Controller
{
    public function show(string $token, AppointmentDetailsLink $links): JsonResponse
    {
        $appointment = $links->appointmentOf($token);
        // Known only now, from the appointment: the relations below are tenant-scoped.
        app(CurrentOrganization::class)->set($appointment->organization_id);
        $appointment->load(['membership.user', 'service', 'organization.address.city.province']);

        $accessCode = PatientAccessCode::query()
            ->where('appointment_id', $appointment->id)
            ->whereNull('redeemed_at')
            ->valid()
            ->first();

        return response()->json([
            'organization' => new PublicOrganizationResource($appointment->organization),
            'appointment' => new BookingConfirmationResource($appointment),
            'access_code' => $accessCode?->formatted(),
        ]);
    }
}
