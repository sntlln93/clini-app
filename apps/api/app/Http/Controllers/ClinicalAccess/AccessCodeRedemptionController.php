<?php

declare(strict_types=1);

namespace App\Http\Controllers\ClinicalAccess;

use App\Actions\ClinicalAccess\RedeemPatientAccessCodeAction;
use App\Data\ClinicalAccess\AccessCodeRedemptionData;
use App\Http\Controllers\Controller;
use App\Http\Requests\ClinicalAccess\RedeemAccessCodeRequest;
use App\Models\ClinicalNote;
use App\Models\Membership;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class AccessCodeRedemptionController extends Controller
{
    public function store(RedeemAccessCodeRequest $request, Patient $patient, RedeemPatientAccessCodeAction $action): JsonResponse
    {
        Gate::authorize('viewAnyForPatient', [ClinicalNote::class, $patient]);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $accessCode = $action->handle(new AccessCodeRedemptionData(
            organizationId: $membership->organization_id,
            membershipId: $membership->id,
            patientId: $patient->id,
            code: $request->string('code')->toString(),
        ));

        return response()->json([
            'data' => [
                'expires_at' => $accessCode->expires_at,
            ],
        ], 201);
    }
}
