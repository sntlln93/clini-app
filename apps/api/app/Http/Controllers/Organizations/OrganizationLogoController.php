<?php

declare(strict_types=1);

namespace App\Http\Controllers\Organizations;

use App\Actions\Organizations\RemoveOrganizationLogoAction;
use App\Actions\Organizations\StoreOrganizationLogoAction;
use App\Data\Organizations\OrganizationLogoData;
use App\Data\Organizations\OrganizationLogoRemovalData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Organizations\StoreOrganizationLogoRequest;
use App\Http\Resources\Organizations\OrganizationLogoResource;
use App\Models\Organization;
use App\Models\OrganizationLogo;
use App\Support\CurrentOrganization;
use Illuminate\Http\Response;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;

class OrganizationLogoController extends Controller
{
    public function show(CurrentOrganization $currentOrganization): OrganizationLogoResource
    {
        Gate::authorize('manage', OrganizationLogo::class);

        return new OrganizationLogoResource(Organization::with('logo')->findOrFail($currentOrganization->getOrFail()));
    }

    public function store(
        StoreOrganizationLogoRequest $request,
        StoreOrganizationLogoAction $action,
        CurrentOrganization $currentOrganization,
    ): OrganizationLogoResource {
        Gate::authorize('manage', OrganizationLogo::class);

        /** @var UploadedFile $file */
        $file = $request->file('logo');
        $organizationId = $currentOrganization->getOrFail();

        $action->handle(new OrganizationLogoData(
            organizationId: $organizationId,
            mimeType: (string) $file->getMimeType(),
            contents: $file->getContent(),
        ));

        return new OrganizationLogoResource(Organization::with('logo')->findOrFail($organizationId));
    }

    public function destroy(RemoveOrganizationLogoAction $action, CurrentOrganization $currentOrganization): Response
    {
        Gate::authorize('manage', OrganizationLogo::class);

        $action->handle(new OrganizationLogoRemovalData($currentOrganization->getOrFail()));

        return response()->noContent();
    }
}
