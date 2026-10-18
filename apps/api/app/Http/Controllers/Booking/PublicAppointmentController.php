<?php

declare(strict_types=1);

namespace App\Http\Controllers\Booking;

use App\Http\Controllers\Controller;
use App\Http\Resources\Booking\BookingConfirmationResource;
use App\Http\Resources\Booking\PublicOrganizationResource;
use App\Support\AppointmentDetailsLink;
use App\Support\CurrentOrganization;
use Illuminate\Http\JsonResponse;

/**
 * Fully public, like the booking page: the link the reminder carries (#320)
 * is the only credential. Shows the booking confirmation's shape, which
 * never includes the patient.
 */
class PublicAppointmentController extends Controller
{
    public function show(string $token, AppointmentDetailsLink $links): JsonResponse
    {
        $appointment = $links->appointmentOf($token);
        // Known only now, from the appointment: the relations below are tenant-scoped.
        app(CurrentOrganization::class)->set($appointment->organization_id);
        $appointment->load(['membership.user', 'service', 'organization.address.city.province']);

        return response()->json([
            'organization' => new PublicOrganizationResource($appointment->organization),
            'appointment' => new BookingConfirmationResource($appointment),
        ]);
    }
}
