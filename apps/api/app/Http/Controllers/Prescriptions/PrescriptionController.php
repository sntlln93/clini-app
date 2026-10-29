<?php

declare(strict_types=1);

namespace App\Http\Controllers\Prescriptions;

use App\Actions\ClinicalAccess\ReadPatientHistoryAction;
use App\Actions\Prescriptions\IssuePrescriptionAction;
use App\Data\ClinicalAccess\PatientHistoryReadData;
use App\Data\Prescriptions\PrescriptionDraftData;
use App\Enums\ClinicalAccessAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Prescriptions\StorePrescriptionRequest;
use App\Http\Resources\Prescriptions\PrescriptionResource;
use App\Models\Appointment;
use App\Models\Membership;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class PrescriptionController extends Controller
{
    /**
     * Everything PrescriptionResource renders, so it never lazy-loads.
     */
    public const array RELATIONS = ['versions.items', 'annulment'];

    public function index(Request $request, Appointment $appointment, ReadPatientHistoryAction $read): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', [Prescription::class, $appointment]);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $read->handle(new PatientHistoryReadData(
            organizationId: $appointment->organization_id,
            membershipId: $membership->id,
            patientId: $appointment->patient_id,
            action: ClinicalAccessAction::PrescriptionsViewed,
            appointmentId: $appointment->id,
        ));

        $prescriptions = Prescription::query()
            ->where('appointment_id', $appointment->id)
            ->where('membership_id', $membership->id)
            ->with(self::RELATIONS)
            ->orderBy('issued_at', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        return PrescriptionResource::collection($prescriptions);
    }

    public function indexForPatient(Request $request, Patient $patient, ReadPatientHistoryAction $read): AnonymousResourceCollection
    {
        Gate::authorize('viewAnyForPatient', [Prescription::class, $patient]);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $read->handle(new PatientHistoryReadData(
            organizationId: $membership->organization_id,
            membershipId: $membership->id,
            patientId: $patient->id,
            action: ClinicalAccessAction::PrescriptionsViewed,
        ));

        // Every author's, as the notes (#359): reading never lets the reader amend or annul one.
        $prescriptions = Prescription::query()
            ->where('patient_id', $patient->id)
            ->with(['author.user', ...self::RELATIONS])
            ->orderBy('issued_at', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        return PrescriptionResource::collection($prescriptions);
    }

    public function store(
        StorePrescriptionRequest $request,
        Appointment $appointment,
        IssuePrescriptionAction $action
    ): JsonResponse {
        Gate::authorize('create', [Prescription::class, $appointment]);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $prescription = $action->handle(new PrescriptionDraftData(
            organizationId: $appointment->organization_id,
            appointmentId: $appointment->id,
            patientId: $appointment->patient_id,
            membershipId: $membership->id,
            items: $request->prescriptionItems(),
        ));

        return (new PrescriptionResource($prescription->load(self::RELATIONS)))
            ->response()
            ->setStatusCode(201);
    }
}
