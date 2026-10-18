<?php

declare(strict_types=1);

namespace App\Http\Controllers\ClinicalNotes;

use App\Actions\ClinicalNotes\AnnulClinicalNoteAction;
use App\Data\ClinicalNotes\ClinicalNoteAnnulmentData;
use App\Http\Controllers\Controller;
use App\Http\Requests\ClinicalNotes\AnnulClinicalNoteRequest;
use App\Http\Resources\ClinicalNotes\ClinicalNoteResource;
use App\Models\ClinicalNote;
use App\Models\Membership;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class ClinicalNoteAnnulmentController extends Controller
{
    public function store(
        AnnulClinicalNoteRequest $request,
        ClinicalNote $clinicalNote,
        AnnulClinicalNoteAction $action
    ): JsonResponse {
        Gate::authorize('annul', $clinicalNote);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $annulled = $action->handle(new ClinicalNoteAnnulmentData(
            clinicalNoteId: $clinicalNote->id,
            membershipId: $membership->id,
            reason: $request->string('reason')->trim()->toString(),
        ));

        return (new ClinicalNoteResource($annulled->load(ClinicalNoteController::RELATIONS)))
            ->response()
            ->setStatusCode(201);
    }
}
