<?php

declare(strict_types=1);

namespace App\Http\Controllers\VitalSigns;

use App\Actions\ClinicalAccess\ReadPatientHistoryAction;
use App\Actions\VitalSigns\RecordVitalSignAction;
use App\Data\ClinicalAccess\PatientHistoryReadData;
use App\Data\VitalSigns\VitalSignDraftData;
use App\Enums\ClinicalAccessAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\VitalSigns\StoreVitalSignRequest;
use App\Http\Resources\VitalSigns\VitalSignResource;
use App\Models\Appointment;
use App\Models\Membership;
use App\Models\Patient;
use App\Models\User;
use App\Models\VitalSign;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class VitalSignController extends Controller
{
    /**
     * Everything VitalSignResource renders, so it never lazy-loads.
     */
    public const array RELATIONS = ['author.user', 'versions', 'annulment'];

    public function indexForPatient(Request $request, Patient $patient, ReadPatientHistoryAction $read): AnonymousResourceCollection
    {
        Gate::authorize('viewAnyForPatient', [VitalSign::class, $patient]);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $read->handle(new PatientHistoryReadData(
            organizationId: $membership->organization_id,
            membershipId: $membership->id,
            patientId: $patient->id,
            action: ClinicalAccessAction::VitalSignsViewed,
        ));

        // Every author's the reader may read, as the medication (#359, #364): reading never lets them amend or annul one.
        $vitalSigns = VitalSign::query()
            ->where('patient_id', $patient->id)
            ->readableBy($membership->id)
            ->with(self::RELATIONS)
            ->orderBy('measured_at', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        return VitalSignResource::collection($vitalSigns);
    }

    public function store(
        StoreVitalSignRequest $request,
        Appointment $appointment,
        RecordVitalSignAction $action
    ): JsonResponse {
        Gate::authorize('create', [VitalSign::class, $appointment]);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $vitalSign = $action->handle(new VitalSignDraftData(
            organizationId: $appointment->organization_id,
            appointmentId: $appointment->id,
            patientId: $appointment->patient_id,
            membershipId: $membership->id,
            values: $request->values(),
        ));

        return (new VitalSignResource($vitalSign->load(self::RELATIONS)))
            ->response()
            ->setStatusCode(201);
    }
}
