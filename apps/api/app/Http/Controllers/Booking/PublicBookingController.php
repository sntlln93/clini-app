<?php

declare(strict_types=1);

namespace App\Http\Controllers\Booking;

use App\Actions\Booking\ListAvailableSlotsAction;
use App\Data\Booking\SlotSearchData;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Booking\SlotSearchRequest;
use App\Http\Resources\Booking\AvailableSlotResource;
use App\Http\Resources\Booking\PublicOrganizationResource;
use App\Http\Resources\Booking\PublicProfessionalResource;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\ProfessionalService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

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

    public function slots(SlotSearchRequest $request, string $slug, ListAvailableSlotsAction $action): AnonymousResourceCollection
    {
        $organization = Organization::where('slug', $slug)->firstOrFail();

        $slots = $action->handle(new SlotSearchData(
            organizationId: $organization->id,
            membershipId: $request->integer('membership_id'),
            serviceId: $request->integer('service_id'),
            from: CarbonImmutable::parse($request->string('from')->toString()),
            to: CarbonImmutable::parse($request->string('to')->toString()),
        ));

        return AvailableSlotResource::collection($slots);
    }
}
