<?php

declare(strict_types=1);

namespace App\Http\Controllers\ClinicalAccess;

use App\Actions\ClinicalAccess\DeclareExceptionalAccessAction;
use App\Data\ClinicalAccess\ExceptionalAccessDeclarationData;
use App\Enums\ClinicalAccessAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\ClinicalAccess\DeclareExceptionalAccessRequest;
use App\Http\Requests\ClinicalAccess\IndexExceptionalAccessRequest;
use App\Http\Resources\ClinicalAccess\ExceptionalAccessGrantResource;
use App\Http\Resources\ClinicalAccess\ExceptionalAccessResource;
use App\Models\ClinicalAccessLog;
use App\Models\Membership;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

/**
 * Opening a patient's history without an appointment near today, and the owner's list of those accesses (#325,
 * ADR 0022). Both stay open on an expired subscription: they only lead to reads.
 */
class ExceptionalAccessController extends Controller
{
    public function index(IndexExceptionalAccessRequest $request): AnonymousResourceCollection
    {
        Gate::authorize('viewExceptional', ClinicalAccessLog::class);

        $accesses = ClinicalAccessLog::query()
            ->where('action', ClinicalAccessAction::ExceptionalAccess)
            ->with(['accessor.user', 'patient'])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page') ?: 15)
            ->withQueryString();

        return ExceptionalAccessResource::collection($accesses);
    }

    public function store(
        DeclareExceptionalAccessRequest $request,
        Patient $patient,
        DeclareExceptionalAccessAction $action,
    ): JsonResponse {
        Gate::authorize('declareExceptional', [ClinicalAccessLog::class, $patient]);

        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $access = $action->handle(new ExceptionalAccessDeclarationData(
            organizationId: $membership->organization_id,
            membershipId: $membership->id,
            patientId: $patient->id,
            reason: $request->accessReason(),
            reasonDetail: $request->reasonDetail(),
        ));

        return (new ExceptionalAccessGrantResource($access))
            ->response()
            ->setStatusCode(201);
    }
}
