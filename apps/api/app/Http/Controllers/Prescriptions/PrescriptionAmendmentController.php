<?php

declare(strict_types=1);

namespace App\Http\Controllers\Prescriptions;

use App\Actions\Prescriptions\AmendPrescriptionAction;
use App\Data\Prescriptions\PrescriptionAmendmentData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Prescriptions\AmendPrescriptionRequest;
use App\Http\Resources\Prescriptions\PrescriptionResource;
use App\Models\Membership;
use App\Models\Prescription;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class PrescriptionAmendmentController extends Controller
{
    public function store(
        AmendPrescriptionRequest $request,
        Prescription $prescription,
        AmendPrescriptionAction $action
    ): JsonResponse {
        Gate::authorize('amend', $prescription);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $amended = $action->handle(new PrescriptionAmendmentData(
            prescriptionId: $prescription->id,
            membershipId: $membership->id,
            items: $request->prescriptionItems(),
            reason: $request->reason(),
        ));

        return (new PrescriptionResource($amended->load(PrescriptionController::RELATIONS)))
            ->response()
            ->setStatusCode(201);
    }
}
