<?php

declare(strict_types=1);

namespace App\Http\Controllers\Memberships;

use App\Actions\Memberships\DeactivateMembershipAction;
use App\Actions\Memberships\UpdateMembershipAction;
use App\Data\Memberships\MembershipUpdateData;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Memberships\DeleteMembershipRequest;
use App\Http\Requests\Memberships\IndexMembershipRequest;
use App\Http\Requests\Memberships\UpdateMembershipRequest;
use App\Http\Resources\Memberships\MembershipResource;
use App\Models\Membership;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class MembershipController extends Controller
{
    public function index(IndexMembershipRequest $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Membership::class);

        $perPage = $request->integer('per_page') ?: 15;

        $memberships = Membership::withTrashed()
            ->search($request->string('q')->toString() ?: null)
            ->with('user')
            ->orderBy('created_at')
            ->orderBy('id')
            ->paginate($perPage)
            ->withQueryString();

        return MembershipResource::collection($memberships);
    }

    public function update(
        UpdateMembershipRequest $request,
        Membership $membership,
        UpdateMembershipAction $action
    ): MembershipResource {
        Gate::authorize('update', $membership);

        $updated = $action->handle($this->dtoFrom($request, $membership));

        return new MembershipResource($updated->load('user'));
    }

    public function destroy(
        DeleteMembershipRequest $request,
        Membership $membership,
        DeactivateMembershipAction $action
    ): Response {
        Gate::authorize('delete', $membership);

        /** @var array<int, MembershipRole> $roles */
        $roles = $membership->roles;

        $action->handle(new MembershipUpdateData(
            membershipId: $membership->id,
            roles: $roles,
            status: MembershipStatus::Inactive,
        ));

        return response()->noContent();
    }

    private function dtoFrom(UpdateMembershipRequest $request, Membership $membership): MembershipUpdateData
    {
        /** @var array<int, string> $rawRoles */
        $rawRoles = $request->validated('roles');

        /** @var string $rawStatus */
        $rawStatus = $request->validated('status');

        return new MembershipUpdateData(
            membershipId: $membership->id,
            roles: array_map(static fn (string $role): MembershipRole => MembershipRole::from($role), $rawRoles),
            status: MembershipStatus::from($rawStatus),
        );
    }
}
