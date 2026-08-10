<?php

declare(strict_types=1);

namespace App\Http\Controllers\Booking;

use App\Actions\Booking\BookOnlineAppointmentAction;
use App\Actions\Booking\ListAvailableSlotsAction;
use App\Data\Booking\OnlineBookingData;
use App\Data\Booking\SlotSearchData;
use App\Enums\DocumentType;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Booking\SlotSearchRequest;
use App\Http\Requests\Booking\StoreOnlineBookingRequest;
use App\Http\Resources\Booking\AvailableSlotResource;
use App\Http\Resources\Booking\BookingConfirmationResource;
use App\Http\Resources\Booking\PublicOrganizationResource;
use App\Http\Resources\Booking\PublicProfessionalResource;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\ProfessionalService;
use App\Support\CurrentOrganization;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Fully public: no auth:sanctum, no `organization` middleware. The tenant
 * is resolved by `public-organization` (`ResolvePublicOrganization`) from the {slug} route
 * parameter (an organization slug or a professional's own public slug),
 * so every query below is scoped through the models' own global scope.
 * Read via CurrentOrganization rather than re-queried by {slug} — a
 * membership slug would 404 against `organizations.slug`.
 */
class PublicBookingController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $organization = Organization::findOrFail((int) app(CurrentOrganization::class)->get());
        $preselectedMembershipId = $request->attributes->has('public_membership_id')
            ? $request->attributes->getInt('public_membership_id')
            : null;

        $membershipsQuery = Membership::query()
            ->where('status', MembershipStatus::Active);

        if ($preselectedMembershipId !== null) {
            $membershipsQuery->where('id', $preselectedMembershipId);
        }

        $memberships = $membershipsQuery
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
            'preselected_membership_id' => $preselectedMembershipId,
        ]);
    }

    public function slots(SlotSearchRequest $request, ListAvailableSlotsAction $action): AnonymousResourceCollection
    {
        $organization = Organization::findOrFail((int) app(CurrentOrganization::class)->get());

        $slots = $action->handle(new SlotSearchData(
            organizationId: $organization->id,
            membershipId: $request->integer('membership_id'),
            serviceId: $request->integer('service_id'),
            from: CarbonImmutable::parse($request->string('from')->toString()),
            to: CarbonImmutable::parse($request->string('to')->toString()),
        ));

        return AvailableSlotResource::collection($slots);
    }

    public function store(StoreOnlineBookingRequest $request, BookOnlineAppointmentAction $action): JsonResponse
    {
        $organization = Organization::findOrFail((int) app(CurrentOrganization::class)->get());

        $appointment = $action->handle(new OnlineBookingData(
            organizationId: $organization->id,
            membershipId: $request->integer('membership_id'),
            serviceId: $request->integer('service_id'),
            startAt: CarbonImmutable::parse($request->string('start_at')->toString()),
            patientName: $request->string('patient.name')->toString(),
            documentType: DocumentType::from($request->string('patient.document_type')->toString()),
            documentNumber: $request->string('patient.document_number')->toString(),
            email: $request->filled('patient.email') ? $request->string('patient.email')->toString() : null,
            phone: $request->filled('patient.phone') ? $request->string('patient.phone')->toString() : null,
        ));

        return (new BookingConfirmationResource($appointment->load(['membership.user', 'service', 'organization'])))
            ->response()
            ->setStatusCode(201);
    }
}
