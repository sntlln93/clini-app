<?php

declare(strict_types=1);

namespace App\Http\Controllers\VitalSigns;

use App\Actions\VitalSigns\AnnulVitalSignAction;
use App\Data\VitalSigns\VitalSignAnnulmentData;
use App\Http\Controllers\Controller;
use App\Http\Requests\VitalSigns\AnnulVitalSignRequest;
use App\Http\Resources\VitalSigns\VitalSignResource;
use App\Models\Membership;
use App\Models\User;
use App\Models\VitalSign;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class VitalSignAnnulmentController extends Controller
{
    public function store(
        AnnulVitalSignRequest $request,
        VitalSign $vitalSign,
        AnnulVitalSignAction $action
    ): JsonResponse {
        Gate::authorize('annul', $vitalSign);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $annulled = $action->handle(new VitalSignAnnulmentData(
            vitalSignId: $vitalSign->id,
            membershipId: $membership->id,
            reason: $request->string('reason')->trim()->toString(),
        ));

        return (new VitalSignResource($annulled->load(VitalSignController::RELATIONS)))
            ->response()
            ->setStatusCode(201);
    }
}
