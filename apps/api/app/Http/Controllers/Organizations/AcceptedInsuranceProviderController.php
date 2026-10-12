<?php

declare(strict_types=1);

namespace App\Http\Controllers\Organizations;

use App\Actions\Organizations\SyncAcceptedInsuranceProvidersAction;
use App\Data\Organizations\AcceptedInsuranceProviderSelectionData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Organizations\UpdateAcceptedInsuranceProvidersRequest;
use App\Http\Resources\Catalog\InsuranceProviderResource;
use App\Models\AcceptedInsuranceProvider;
use App\Models\Organization;
use App\Support\CurrentOrganization;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

/** The insurance providers the practice offers on its booking page (#291). */
class AcceptedInsuranceProviderController extends Controller
{
    public function index(CurrentOrganization $currentOrganization): AnonymousResourceCollection
    {
        Gate::authorize('manage', AcceptedInsuranceProvider::class);

        $organization = Organization::query()->findOrFail($currentOrganization->getOrFail());

        return InsuranceProviderResource::collection($organization->acceptedInsuranceProviders()->orderBy('name')->get());
    }

    public function update(
        UpdateAcceptedInsuranceProvidersRequest $request,
        SyncAcceptedInsuranceProvidersAction $action,
        CurrentOrganization $currentOrganization,
    ): AnonymousResourceCollection {
        Gate::authorize('manage', AcceptedInsuranceProvider::class);

        $accepted = $action->handle(new AcceptedInsuranceProviderSelectionData(
            organizationId: $currentOrganization->getOrFail(),
            insuranceProviderIds: $request->insuranceProviderIds(),
        ));

        return InsuranceProviderResource::collection($accepted);
    }
}
