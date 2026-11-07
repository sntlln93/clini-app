<?php

declare(strict_types=1);

namespace App\Http\Controllers\MedicalHistory;

use App\Actions\MedicalHistory\RecordBloodTypeAction;
use App\Data\MedicalHistory\BloodTypeRecordData;
use App\Http\Controllers\Controller;
use App\Http\Requests\MedicalHistory\StoreBloodTypeRequest;
use App\Http\Resources\MedicalHistory\BloodTypeRecordResource;
use App\Models\Appointment;
use App\Models\MedicalHistoryEntry;
use App\Models\Membership;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class BloodTypeController extends Controller
{
    public function store(
        StoreBloodTypeRequest $request,
        Appointment $appointment,
        RecordBloodTypeAction $action
    ): JsonResponse {
        // Part of the background: recorded on one's own appointment, as an allergy.
        Gate::authorize('create', [MedicalHistoryEntry::class, $appointment]);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $record = $action->handle(new BloodTypeRecordData(
            organizationId: $appointment->organization_id,
            appointmentId: $appointment->id,
            patientId: $appointment->patient_id,
            membershipId: $membership->id,
            bloodType: $request->bloodType(),
            reason: $request->reason(),
        ));

        return (new BloodTypeRecordResource($record->load('author.user')))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * A blood type outside an appointment (#382, ADR 0037), such as one from a study that arrives later.
     */
    public function storeForPatient(
        StoreBloodTypeRequest $request,
        Patient $patient,
        RecordBloodTypeAction $action
    ): JsonResponse {
        Gate::authorize('createForPatient', [MedicalHistoryEntry::class, $patient]);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $record = $action->handle(new BloodTypeRecordData(
            organizationId: $membership->organization_id,
            appointmentId: null,
            patientId: $patient->id,
            membershipId: $membership->id,
            bloodType: $request->bloodType(),
            reason: $request->reason(),
        ));

        return (new BloodTypeRecordResource($record->load('author.user')))
            ->response()
            ->setStatusCode(201);
    }
}
