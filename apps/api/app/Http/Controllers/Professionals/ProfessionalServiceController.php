<?php

declare(strict_types=1);

namespace App\Http\Controllers\Professionals;

use App\Actions\Professionals\AssignProfessionalServiceAction;
use App\Data\Professionals\ProfessionalServiceAssignmentData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Professionals\StoreProfessionalServiceRequest;
use App\Http\Requests\Professionals\UpdateProfessionalServiceRequest;
use App\Http\Resources\Professionals\ProfessionalServiceResource;
use App\Models\Membership;
use App\Models\ProfessionalService;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class ProfessionalServiceController extends Controller
{
    public function index(Membership $membership): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', [ProfessionalService::class, $membership]);

        $professionalServices = ProfessionalService::query()
            ->where('membership_id', $membership->id)
            ->with('service')
            ->get();

        return ProfessionalServiceResource::collection($professionalServices);
    }

    public function store(
        StoreProfessionalServiceRequest $request,
        Membership $membership,
        AssignProfessionalServiceAction $action
    ): JsonResponse {
        Gate::authorize('create', [ProfessionalService::class, $membership]);

        $professionalService = $action->handle($this->dtoFrom($request, $membership, $request->integer('service_id')));

        return (new ProfessionalServiceResource($professionalService->load('service')))
            ->response()
            ->setStatusCode(201);
    }

    public function update(
        UpdateProfessionalServiceRequest $request,
        Membership $membership,
        Service $service,
        AssignProfessionalServiceAction $action
    ): ProfessionalServiceResource {
        $professionalService = $this->findOrNew($membership, $service);

        Gate::authorize('update', $professionalService);

        $updated = $action->handle($this->dtoFrom($request, $membership, $service->id));

        return new ProfessionalServiceResource($updated->load('service'));
    }

    public function destroy(Membership $membership, Service $service): Response
    {
        $professionalService = $this->findOrNew($membership, $service);

        Gate::authorize('delete', $professionalService);

        if ($professionalService->exists) {
            $professionalService->delete();
        }

        return response()->noContent();
    }

    private function findOrNew(Membership $membership, Service $service): ProfessionalService
    {
        return ProfessionalService::query()
            ->where('membership_id', $membership->id)
            ->where('service_id', $service->id)
            ->first() ?? new ProfessionalService([
                'organization_id' => $membership->organization_id,
                'membership_id' => $membership->id,
            ]);
    }

    private function dtoFrom(
        StoreProfessionalServiceRequest|UpdateProfessionalServiceRequest $request,
        Membership $membership,
        int $serviceId
    ): ProfessionalServiceAssignmentData {
        return new ProfessionalServiceAssignmentData(
            organizationId: $membership->organization_id,
            membershipId: $membership->id,
            serviceId: $serviceId,
            durationMinutes: $request->integer('duration_minutes'),
            priceCents: $request->integer('price_cents') ?: null,
            active: $request->boolean('active', true),
        );
    }
}
