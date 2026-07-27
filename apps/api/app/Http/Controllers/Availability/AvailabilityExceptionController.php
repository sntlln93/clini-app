<?php

declare(strict_types=1);

namespace App\Http\Controllers\Availability;

use App\Actions\Availability\SaveAvailabilityExceptionAction;
use App\Data\Availability\AvailabilityExceptionData;
use App\Enums\AvailabilityExceptionType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Availability\StoreAvailabilityExceptionRequest;
use App\Http\Requests\Availability\UpdateAvailabilityExceptionRequest;
use App\Http\Resources\Availability\AvailabilityExceptionResource;
use App\Models\AvailabilityException;
use App\Support\CurrentOrganization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class AvailabilityExceptionController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', AvailabilityException::class);

        $membershipId = $request->integer('membership_id') ?: null;

        $query = AvailabilityException::query();

        if ($membershipId !== null) {
            $query->where(function ($builder) use ($membershipId): void {
                $builder->where('membership_id', $membershipId)
                    ->orWhereNull('membership_id');
            });
        }

        $availabilityExceptions = $query->orderBy('start_at')->get();

        return AvailabilityExceptionResource::collection($availabilityExceptions);
    }

    public function store(
        StoreAvailabilityExceptionRequest $request,
        SaveAvailabilityExceptionAction $action
    ): JsonResponse {
        $membershipId = $request->filled('membership_id') ? $request->integer('membership_id') : null;

        Gate::authorize('create', [AvailabilityException::class, $membershipId]);

        $availabilityException = $action->handle(new AvailabilityExceptionData(
            availabilityExceptionId: null,
            organizationId: (int) app(CurrentOrganization::class)->get(),
            membershipId: $membershipId,
            type: AvailabilityExceptionType::from((string) $request->string('type')),
            startAt: (string) $request->string('start_at'),
            endAt: (string) $request->string('end_at'),
            reason: $request->filled('reason') ? (string) $request->string('reason') : null,
        ));

        return (new AvailabilityExceptionResource($availabilityException))
            ->response()
            ->setStatusCode(201);
    }

    public function update(
        UpdateAvailabilityExceptionRequest $request,
        AvailabilityException $availabilityException,
        SaveAvailabilityExceptionAction $action
    ): AvailabilityExceptionResource {
        Gate::authorize('update', $availabilityException);

        $membershipId = $request->filled('membership_id') ? $request->integer('membership_id') : null;

        $updated = $action->handle(new AvailabilityExceptionData(
            availabilityExceptionId: $availabilityException->id,
            organizationId: $availabilityException->organization_id,
            membershipId: $membershipId,
            type: AvailabilityExceptionType::from((string) $request->string('type')),
            startAt: (string) $request->string('start_at'),
            endAt: (string) $request->string('end_at'),
            reason: $request->filled('reason') ? (string) $request->string('reason') : null,
        ));

        return new AvailabilityExceptionResource($updated);
    }

    public function destroy(AvailabilityException $availabilityException): Response
    {
        Gate::authorize('delete', $availabilityException);

        $availabilityException->delete();

        return response()->noContent();
    }
}
