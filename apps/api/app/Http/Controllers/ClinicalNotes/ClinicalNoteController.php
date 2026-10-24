<?php

declare(strict_types=1);

namespace App\Http\Controllers\ClinicalNotes;

use App\Actions\ClinicalAccess\ReadPatientHistoryAction;
use App\Actions\ClinicalNotes\WriteClinicalNoteAction;
use App\Data\ClinicalAccess\PatientHistoryReadData;
use App\Data\ClinicalNotes\ClinicalNoteDraftData;
use App\Enums\ClinicalAccessAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\ClinicalNotes\StoreClinicalNoteRequest;
use App\Http\Resources\ClinicalNotes\ClinicalNoteResource;
use App\Models\Appointment;
use App\Models\ClinicalNote;
use App\Models\Membership;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class ClinicalNoteController extends Controller
{
    /**
     * Everything ClinicalNoteResource renders, so it never lazy-loads.
     */
    public const array RELATIONS = ['versions.diagnoses', 'annulment'];

    public function index(Request $request, Appointment $appointment, ReadPatientHistoryAction $read): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', [ClinicalNote::class, $appointment]);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $read->handle(new PatientHistoryReadData(
            organizationId: $appointment->organization_id,
            membershipId: $membership->id,
            patientId: $appointment->patient_id,
            action: ClinicalAccessAction::NotesViewed,
            appointmentId: $appointment->id,
        ));

        $notes = ClinicalNote::query()
            ->where('appointment_id', $appointment->id)
            ->where('membership_id', $membership->id)
            ->with(self::RELATIONS)
            ->orderBy('created_at', 'desc')
            ->get();

        return ClinicalNoteResource::collection($notes);
    }

    public function indexForPatient(Request $request, Patient $patient, ReadPatientHistoryAction $read): AnonymousResourceCollection
    {
        Gate::authorize('viewAnyForPatient', [ClinicalNote::class, $patient]);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $read->handle(new PatientHistoryReadData(
            organizationId: $membership->organization_id,
            membershipId: $membership->id,
            patientId: $patient->id,
            action: ClinicalAccessAction::NotesViewed,
        ));

        $notes = ClinicalNote::query()
            ->forPatient($patient->id)
            ->with(['author.user', 'appointment', ...self::RELATIONS])
            ->orderBy('created_at', 'desc')
            ->get();

        return ClinicalNoteResource::collection($notes);
    }

    public function store(
        StoreClinicalNoteRequest $request,
        Appointment $appointment,
        WriteClinicalNoteAction $action
    ): JsonResponse {
        Gate::authorize('create', [ClinicalNote::class, $appointment]);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $note = $action->handle(new ClinicalNoteDraftData(
            organizationId: $appointment->organization_id,
            appointmentId: $appointment->id,
            patientId: $appointment->patient_id,
            membershipId: $membership->id,
            body: $request->string('body')->toString(),
            icd10CodeIds: $request->icd10CodeIds(),
        ));

        return (new ClinicalNoteResource($note->load(self::RELATIONS)))
            ->response()
            ->setStatusCode(201);
    }
}
