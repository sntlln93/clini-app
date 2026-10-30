<?php

declare(strict_types=1);

namespace App\Http\Controllers\ClinicalAccess;

use App\Actions\ClinicalAccess\ResendPatientAccessCodeAction;
use App\Data\ClinicalAccess\AccessCodeDeliveryData;
use App\Http\Controllers\Controller;
use App\Http\Requests\ClinicalAccess\DeliverAccessCodeRequest;
use App\Models\Appointment;
use App\Models\Membership;
use App\Models\User;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class AccessCodeDeliveryController extends Controller
{
    public function store(DeliverAccessCodeRequest $request, Appointment $appointment, ResendPatientAccessCodeAction $action): Response
    {
        // Whoever manages the appointment (the reception, too) may resend it; nobody sees it in the panel.
        Gate::authorize('update', $appointment);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $action->handle(new AccessCodeDeliveryData(
            organizationId: $membership->organization_id,
            membershipId: $membership->id,
            appointmentId: $appointment->id,
            contactId: $request->integer('contact_id'),
        ));

        return response()->noContent();
    }
}
