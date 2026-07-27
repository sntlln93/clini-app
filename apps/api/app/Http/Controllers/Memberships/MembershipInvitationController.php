<?php

declare(strict_types=1);

namespace App\Http\Controllers\Memberships;

use App\Actions\Memberships\InviteMemberAction;
use App\Data\Memberships\MembershipInvitationData;
use App\Enums\MembershipRole;
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

        $action->handle($this->dtoFrom($request));

        return response()->json(['message' => 'Invitación enviada.'], 201);
    }

    public function resend(StoreMembershipInvitationRequest $request, InviteMemberAction $action): JsonResponse
    {
        Gate::authorize('create', Membership::class);

        $action->handle($this->dtoFrom($request));

        return response()->json(['message' => 'Invitación reenviada.']);
    }

    private function dtoFrom(StoreMembershipInvitationRequest $request): MembershipInvitationData
    {
        /** @var array<int, string> $rawRoles */
        $rawRoles = $request->validated('roles');

        return new MembershipInvitationData(
            organizationId: $this->currentOrganizationId(),
            email: $request->string('email')->toString(),
            roles: array_map(static fn (string $role): MembershipRole => MembershipRole::from($role), $rawRoles),
        );
    }

    /**
     * The `organization` middleware (ResolveCurrentOrganization) always
     * sets an active organization before a request reaches this
     * controller — it aborts 403 otherwise — so this narrows the nullable
     * getter to a definite int for callers.
     */
    private function currentOrganizationId(): int
    {
        $organizationId = app(CurrentOrganization::class)->get();

        if ($organizationId === null) {
            abort(403);
        }

        return $organizationId;
    }
}
