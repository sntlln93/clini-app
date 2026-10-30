<?php

declare(strict_types=1);

namespace App\Http\Controllers\VitalSigns;

use App\Actions\VitalSigns\AmendVitalSignAction;
use App\Data\VitalSigns\VitalSignAmendmentData;
use App\Http\Controllers\Controller;
use App\Http\Requests\VitalSigns\AmendVitalSignRequest;
use App\Http\Resources\VitalSigns\VitalSignResource;
use App\Models\Membership;
use App\Models\User;
use App\Models\VitalSign;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class VitalSignAmendmentController extends Controller
{
    public function store(
        AmendVitalSignRequest $request,
        VitalSign $vitalSign,
        AmendVitalSignAction $action
    ): JsonResponse {
        Gate::authorize('amend', $vitalSign);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $amended = $action->handle(new VitalSignAmendmentData(
            vitalSignId: $vitalSign->id,
            membershipId: $membership->id,
            values: $request->values(),
            reason: $request->reason(),
        ));

        return (new VitalSignResource($amended->load(VitalSignController::RELATIONS)))
            ->response()
            ->setStatusCode(201);
    }
}
