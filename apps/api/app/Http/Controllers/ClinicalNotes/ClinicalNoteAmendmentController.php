<?php

declare(strict_types=1);

namespace App\Http\Controllers\ClinicalNotes;

use App\Actions\ClinicalNotes\AmendClinicalNoteAction;
use App\Data\ClinicalNotes\ClinicalNoteAmendmentData;
use App\Http\Controllers\Controller;
use App\Http\Requests\ClinicalNotes\AmendClinicalNoteRequest;
use App\Http\Resources\ClinicalNotes\ClinicalNoteResource;
use App\Models\ClinicalNote;
use App\Models\Membership;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class ClinicalNoteAmendmentController extends Controller
{
    public function store(
        AmendClinicalNoteRequest $request,
        ClinicalNote $clinicalNote,
        AmendClinicalNoteAction $action
    ): JsonResponse {
        Gate::authorize('amend', $clinicalNote);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $amended = $action->handle(new ClinicalNoteAmendmentData(
            clinicalNoteId: $clinicalNote->id,
            membershipId: $membership->id,
            body: $request->string('body')->toString(),
            icd10CodeIds: $request->amendedIcd10CodeIds(),
            reason: $request->reason(),
        ));

        return (new ClinicalNoteResource($amended->load(ClinicalNoteController::RELATIONS)))
            ->response()
            ->setStatusCode(201);
    }
}
