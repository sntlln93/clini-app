<?php

declare(strict_types=1);

namespace App\Http\Controllers\Prescriptions;

use App\Actions\Prescriptions\AnnulPrescriptionAction;
use App\Data\Prescriptions\PrescriptionAnnulmentData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Prescriptions\AnnulPrescriptionRequest;
use App\Http\Resources\Prescriptions\PrescriptionResource;
use App\Models\Membership;
use App\Models\Prescription;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class PrescriptionAnnulmentController extends Controller
{
    public function store(
        AnnulPrescriptionRequest $request,
        Prescription $prescription,
        AnnulPrescriptionAction $action
    ): JsonResponse {
        Gate::authorize('annul', $prescription);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $annulled = $action->handle(new PrescriptionAnnulmentData(
            prescriptionId: $prescription->id,
            membershipId: $membership->id,
            reason: $request->string('reason')->trim()->toString(),
        ));

        return (new PrescriptionResource($annulled->load(PrescriptionController::RELATIONS)))
            ->response()
            ->setStatusCode(201);
    }
}
