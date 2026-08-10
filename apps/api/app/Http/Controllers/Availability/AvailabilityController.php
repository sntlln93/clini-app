<?php

declare(strict_types=1);

namespace App\Http\Controllers\Availability;

use App\Actions\Availability\SaveAvailabilitySlotAction;
use App\Data\Availability\AvailabilitySlotData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Availability\StoreAvailabilityRequest;
use App\Http\Requests\Availability\UpdateAvailabilityRequest;
use App\Http\Resources\Availability\AvailabilityResource;
use App\Models\Availability;
use App\Models\Membership;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class AvailabilityController extends Controller
{
    public function index(Membership $membership): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', [Availability::class, $membership]);

        $availabilities = Availability::query()
            ->where('membership_id', $membership->id)
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();

        return AvailabilityResource::collection($availabilities);
    }

    public function store(
        StoreAvailabilityRequest $request,
        Membership $membership,
        SaveAvailabilitySlotAction $action
    ): JsonResponse {
        Gate::authorize('create', [Availability::class, $membership]);

        $availability = $action->handle(new AvailabilitySlotData(
            availabilityId: null,
            organizationId: $membership->organization_id,
            membershipId: $membership->id,
            dayOfWeek: $request->integer('day_of_week'),
            startTime: (string) $request->string('start_time'),
            endTime: (string) $request->string('end_time'),
            merge: $request->boolean('merge'),
        ));

        return (new AvailabilityResource($availability))
            ->response()
            ->setStatusCode(201);
    }

    public function update(
        UpdateAvailabilityRequest $request,
        Availability $availability,
        SaveAvailabilitySlotAction $action
    ): AvailabilityResource {
        Gate::authorize('update', $availability);

        $updated = $action->handle(new AvailabilitySlotData(
            availabilityId: $availability->id,
            organizationId: $availability->organization_id,
            membershipId: $availability->membership_id,
            dayOfWeek: $request->integer('day_of_week'),
            startTime: (string) $request->string('start_time'),
            endTime: (string) $request->string('end_time'),
            merge: $request->boolean('merge'),
        ));

        return new AvailabilityResource($updated);
    }

    public function destroy(Availability $availability): Response
    {
        Gate::authorize('delete', $availability);

        $availability->delete();

        return response()->noContent();
    }
}
