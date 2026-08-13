<?php

declare(strict_types=1);

namespace App\Http\Controllers\Professionals;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\Professionals\ProfessionalResource;
use App\Models\Membership;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class ProfessionalController extends Controller
{
    /**
     * Authorized via viewProfessionalRoster (agenda/availability
     * permissions), not viewAny/memberships.view — this endpoint is a
     * different resource from membership administration.
     */
    public function index(): AnonymousResourceCollection
    {
        Gate::authorize('viewProfessionalRoster', Membership::class);

        $memberships = Membership::query()
            ->where('status', MembershipStatus::Active)
            ->with('user')
            ->get()
            ->filter(function (Membership $membership): bool {
                /** @var array<int, MembershipRole> $roles */
                $roles = $membership->roles;

                return in_array(MembershipRole::Professional, $roles, true);
            })
            ->sortBy(function (Membership $membership): string {
                $user = $membership->user;

                return $user !== null ? $user->name : '';
            })
            ->values();

        return ProfessionalResource::collection($memberships);
    }
}
