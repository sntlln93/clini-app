<?php

declare(strict_types=1);

namespace App\Http\Controllers\Memberships;

use App\Actions\Memberships\InviteMemberAction;
use App\Data\Memberships\MembershipInvitationData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Memberships\StoreMembershipInvitationRequest;
use App\Models\Membership;
use App\Support\CurrentOrganization;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class MembershipInvitationController extends Controller
{
    public function store(StoreMembershipInvitationRequest $request, InviteMemberAction $action): JsonResponse
    {
        Gate::authorize('create', Membership::class);

        $organizationId = app(CurrentOrganization::class)->getOrFail();
        $action->handle(MembershipInvitationData::fromRequest($request, $organizationId));

        return response()->json(['message' => 'Invitación enviada.'], 201);
    }

    public function resend(StoreMembershipInvitationRequest $request, InviteMemberAction $action): JsonResponse
    {
        Gate::authorize('create', Membership::class);

        $organizationId = app(CurrentOrganization::class)->getOrFail();
        $action->handle(MembershipInvitationData::fromRequest($request, $organizationId));

        return response()->json(['message' => 'Invitación reenviada.']);
    }
}
