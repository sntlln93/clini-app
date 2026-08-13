<?php

declare(strict_types=1);

namespace App\Http\Controllers\ClinicalNotes;

use App\Actions\ClinicalNotes\EditClinicalNoteAction;
use App\Actions\ClinicalNotes\WriteClinicalNoteAction;
use App\Data\ClinicalNotes\ClinicalNoteDraftData;
use App\Data\ClinicalNotes\ClinicalNoteEditionData;
use App\Http\Controllers\Controller;
use App\Http\Requests\ClinicalNotes\StoreClinicalNoteRequest;
use App\Http\Requests\ClinicalNotes\UpdateClinicalNoteRequest;
use App\Http\Resources\ClinicalNotes\ClinicalNoteResource;
use App\Models\Appointment;
use App\Models\ClinicalNote;
use App\Models\Membership;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class ClinicalNoteController extends Controller
{
    public function index(Request $request, Appointment $appointment): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', [ClinicalNote::class, $appointment]);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $notes = ClinicalNote::query()
            ->where('appointment_id', $appointment->id)
            ->where('membership_id', $membership->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return ClinicalNoteResource::collection($notes);
    }

    public function indexForPatient(Patient $patient): AnonymousResourceCollection
    {
        Gate::authorize('viewAnyForPatient', [ClinicalNote::class, $patient]);

        $notes = ClinicalNote::query()
            ->forPatient($patient->id)
            ->with(['author.user', 'appointment'])
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
            membershipId: $membership->id,
            body: $request->string('body')->toString(),
        ));

        return (new ClinicalNoteResource($note))
            ->response()
            ->setStatusCode(201);
    }

    public function update(
        UpdateClinicalNoteRequest $request,
        ClinicalNote $clinicalNote,
        EditClinicalNoteAction $action
    ): ClinicalNoteResource {
        Gate::authorize('update', $clinicalNote);

        $updated = $action->handle(new ClinicalNoteEditionData(
            clinicalNoteId: $clinicalNote->id,
            body: $request->string('body')->toString(),
        ));

        return new ClinicalNoteResource($updated);
    }

    public function destroy(ClinicalNote $clinicalNote): Response
    {
        Gate::authorize('delete', $clinicalNote);

        $clinicalNote->delete();

        return response()->noContent();
    }
}
