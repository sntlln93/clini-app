<?php

declare(strict_types=1);

namespace App\Http\Controllers\Prescriptions;

use App\Actions\Prescriptions\EditPrescriptionAction;
use App\Actions\Prescriptions\IssuePrescriptionAction;
use App\Data\Prescriptions\PrescriptionDraftData;
use App\Data\Prescriptions\PrescriptionEditionData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Prescriptions\StorePrescriptionRequest;
use App\Http\Requests\Prescriptions\UpdatePrescriptionRequest;
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
    private const array RELATIONS = ['items', 'patient', 'author.user', 'author.specialties'];

    public function index(Request $request, Appointment $appointment): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', [Prescription::class, $appointment]);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $prescriptions = Prescription::query()
            ->where('appointment_id', $appointment->id)
            ->where('membership_id', $membership->id)
            ->with(self::RELATIONS)
            ->orderBy('issued_at', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        return PrescriptionResource::collection($prescriptions);
    }

    public function indexForPatient(Request $request, Patient $patient): AnonymousResourceCollection
    {
        Gate::authorize('viewAnyForPatient', Prescription::class);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $prescriptions = Prescription::query()
            ->where('patient_id', $patient->id)
            ->where('membership_id', $membership->id)
            ->with(self::RELATIONS)
            ->orderBy('issued_at', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        return PrescriptionResource::collection($prescriptions);
    }

    public function show(Prescription $prescription): PrescriptionResource
    {
        Gate::authorize('view', $prescription);

        return new PrescriptionResource($prescription->load(self::RELATIONS));
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
            diagnosis: $request->diagnosis(),
            items: $request->prescriptionItems(),
        ));

        return (new PrescriptionResource($prescription->load(self::RELATIONS)))
            ->response()
            ->setStatusCode(201);
    }

    public function update(
        UpdatePrescriptionRequest $request,
        Prescription $prescription,
        EditPrescriptionAction $action
    ): PrescriptionResource {
        Gate::authorize('update', $prescription);

        $updated = $action->handle(new PrescriptionEditionData(
            prescriptionId: $prescription->id,
            diagnosis: $request->diagnosis(),
            items: $request->prescriptionItems(),
        ));

        return new PrescriptionResource($updated->load(self::RELATIONS));
    }
}
