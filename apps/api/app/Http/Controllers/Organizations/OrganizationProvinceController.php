<?php

declare(strict_types=1);

namespace App\Http\Controllers\Organizations;

use App\Actions\Organizations\UpdateOrganizationProvinceAction;
use App\Data\Organizations\OrganizationProvinceData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Organizations\UpdateOrganizationProvinceRequest;
use App\Http\Resources\Organizations\OrganizationProvinceResource;
use App\Models\Organization;
use App\Support\CurrentOrganization;
use Illuminate\Support\Facades\Gate;

/** Where the practice attends (#380). The session's `/me` carries it too. */
class OrganizationProvinceController extends Controller
{
    public function update(
        UpdateOrganizationProvinceRequest $request,
        UpdateOrganizationProvinceAction $action,
        CurrentOrganization $currentOrganization,
    ): OrganizationProvinceResource {
        Gate::authorize('updateProvince', Organization::class);

        return new OrganizationProvinceResource($action->handle(new OrganizationProvinceData(
            organizationId: $currentOrganization->getOrFail(),
            province: $request->province(),
        )));
    }
}
