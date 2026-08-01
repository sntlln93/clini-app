<?php

declare(strict_types=1);

namespace App\Http\Controllers\Booking;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\Booking\PublicOrganizationResource;
use App\Http\Resources\Booking\PublicProfessionalResource;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\ProfessionalService;
use Illuminate\Http\JsonResponse;

/**
 * Fully public: no auth:sanctum, no `organization` middleware. The tenant is
 * resolved by `public-organization` (App\Http\Middleware\ResolvePublicOrganization`)
 * straight from the {slug} route parameter, so every query below runs
 * scoped to that organization through the models' own global scope.
 */
class PublicBookingController extends Controller
{
    public function show(string $slug): JsonResponse
    {
        $organization = Organization::where('slug', $slug)->firstOrFail();

        $memberships = Membership::query()
            ->where('status', MembershipStatus::Active)
            ->with(['user', 'specialties'])
            ->get()
            ->filter(function (Membership $membership): bool {
                /** @var array<int, MembershipRole> $roles */
                $roles = $membership->roles;

                return in_array(MembershipRole::Professional, $roles, true);
            })
            ->values();

        $servicesByMembership = ProfessionalService::query()
            ->whereIn('membership_id', $memberships->pluck('id'))
            ->where('active', true)
            ->with('service')
            ->get()
            ->groupBy('membership_id');

        $professionals = $memberships->map(fn (Membership $membership): array => [
            'membership' => $membership,
            'services' => $servicesByMembership->get($membership->id, collect()),
        ]);

        return response()->json([
            'organization' => new PublicOrganizationResource($organization),
            'professionals' => PublicProfessionalResource::collection($professionals),
        ]);
    }
}
