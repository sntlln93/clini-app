<?php

declare(strict_types=1);

namespace App\Http\Controllers\Professionals;

use App\Actions\Professionals\AssignProfessionalServiceAction;
use App\Actions\Professionals\FindOrNewProfessionalServiceAction;
use App\Data\Professionals\ProfessionalServiceAssignmentData;
use App\Data\Professionals\ProfessionalServiceLookupData;
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
    public function __construct(
        private readonly FindOrNewProfessionalServiceAction $findOrNew,
    ) {}

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

        $dto = ProfessionalServiceAssignmentData::fromRequest($request, $membership, $request->integer('service_id'));
        $professionalService = $action->handle($dto);

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
        $dto = ProfessionalServiceAssignmentData::fromRequest($request, $membership, $service->id);
        $lookup = new ProfessionalServiceLookupData(
            organizationId: $dto->organizationId,
            membershipId: $dto->membershipId,
            serviceId: $dto->serviceId,
        );
        $professionalService = $this->findOrNew->handle($lookup);

        Gate::authorize('update', $professionalService);

        $updated = $action->handle($dto);

        return new ProfessionalServiceResource($updated->load('service'));
    }

    public function destroy(Membership $membership, Service $service): Response
    {
        $lookup = new ProfessionalServiceLookupData(
            organizationId: $membership->organization_id,
            membershipId: $membership->id,
            serviceId: $service->id,
        );
        $professionalService = $this->findOrNew->handle($lookup);

        Gate::authorize('delete', $professionalService);

        if ($professionalService->exists) {
            $professionalService->delete();
        }

        return response()->noContent();
    }
}
