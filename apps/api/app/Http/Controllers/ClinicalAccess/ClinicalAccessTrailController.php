<?php

declare(strict_types=1);

namespace App\Http\Controllers\ClinicalAccess;

use App\Actions\ClinicalAccess\ReadClinicalAccessTrailAction;
use App\Data\ClinicalAccess\ClinicalAccessTrailData;
use App\Http\Controllers\Controller;
use App\Http\Requests\ClinicalAccess\IndexClinicalAccessTrailRequest;
use App\Http\Resources\ClinicalAccess\ClinicalAccessTrailEntryResource;
use App\Models\ClinicalAccessLog;
use App\Models\Membership;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

/**
 * A patient's access trail, shown on their page next to the history it records (#325, ADR 0022). Open on an expired
 * subscription, like every read of the history.
 */
class ClinicalAccessTrailController extends Controller
{
    public function index(
        IndexClinicalAccessTrailRequest $request,
        Patient $patient,
        ReadClinicalAccessTrailAction $action,
    ): AnonymousResourceCollection {
        Gate::authorize('viewTrail', [ClinicalAccessLog::class, $patient]);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $entries = $action->handle(new ClinicalAccessTrailData(
            organizationId: $membership->organization_id,
            membershipId: $membership->id,
            patientId: $patient->id,
        ))
            ->paginate($request->integer('per_page') ?: 10)
            ->withQueryString();

        return ClinicalAccessTrailEntryResource::collection($entries);
    }
}
