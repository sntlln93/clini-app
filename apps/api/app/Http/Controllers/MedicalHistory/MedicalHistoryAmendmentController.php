<?php

declare(strict_types=1);

namespace App\Http\Controllers\MedicalHistory;

use App\Actions\MedicalHistory\AmendMedicalHistoryEntryAction;
use App\Data\MedicalHistory\MedicalHistoryEntryAmendmentData;
use App\Http\Controllers\Controller;
use App\Http\Requests\MedicalHistory\AmendMedicalHistoryEntryRequest;
use App\Http\Resources\MedicalHistory\MedicalHistoryEntryResource;
use App\Models\MedicalHistoryEntry;
use App\Models\Membership;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class MedicalHistoryAmendmentController extends Controller
{
    public function store(
        AmendMedicalHistoryEntryRequest $request,
        MedicalHistoryEntry $medicalHistoryEntry,
        AmendMedicalHistoryEntryAction $action
    ): JsonResponse {
        Gate::authorize('amend', $medicalHistoryEntry);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $amended = $action->handle(new MedicalHistoryEntryAmendmentData(
            entryId: $medicalHistoryEntry->id,
            membershipId: $membership->id,
            content: $request->content(),
            reason: $request->reason(),
        ));

        return (new MedicalHistoryEntryResource($amended->load(MedicalHistoryController::ENTRY_RELATIONS)))
            ->response()
            ->setStatusCode(201);
    }
}
