<?php

declare(strict_types=1);

namespace App\Http\Controllers\MedicalHistory;

use App\Actions\MedicalHistory\WithdrawMedicalHistoryEntryAction;
use App\Data\MedicalHistory\MedicalHistoryEntryWithdrawalData;
use App\Http\Controllers\Controller;
use App\Http\Requests\MedicalHistory\WithdrawMedicalHistoryEntryRequest;
use App\Http\Resources\MedicalHistory\MedicalHistoryEntryResource;
use App\Models\MedicalHistoryEntry;
use App\Models\Membership;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class MedicalHistoryWithdrawalController extends Controller
{
    public function store(
        WithdrawMedicalHistoryEntryRequest $request,
        MedicalHistoryEntry $medicalHistoryEntry,
        WithdrawMedicalHistoryEntryAction $action
    ): JsonResponse {
        Gate::authorize('withdraw', $medicalHistoryEntry);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $withdrawn = $action->handle(new MedicalHistoryEntryWithdrawalData(
            entryId: $medicalHistoryEntry->id,
            membershipId: $membership->id,
            reason: $request->reason(),
        ));

        return (new MedicalHistoryEntryResource($withdrawn->load(MedicalHistoryController::ENTRY_RELATIONS)))
            ->response()
            ->setStatusCode(201);
    }
}
