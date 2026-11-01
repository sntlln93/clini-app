<?php

declare(strict_types=1);

namespace App\Http\Controllers\Availability;

use App\Actions\Availability\ReplaceWeeklyAvailabilityAction;
use App\Data\Availability\WeeklyAvailabilityData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Availability\ReplaceWeeklyAvailabilityRequest;
use App\Http\Resources\Availability\AvailabilityResource;
use App\Models\Availability;
use App\Models\Membership;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
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

    public function replace(
        ReplaceWeeklyAvailabilityRequest $request,
        Membership $membership,
        ReplaceWeeklyAvailabilityAction $action
    ): AnonymousResourceCollection {
        Gate::authorize('replace', [Availability::class, $membership]);

        $availabilities = $action->handle(new WeeklyAvailabilityData(
            organizationId: $membership->organization_id,
            membershipId: $membership->id,
            slots: $request->slots(),
        ));

        return AvailabilityResource::collection($availabilities);
    }
}
