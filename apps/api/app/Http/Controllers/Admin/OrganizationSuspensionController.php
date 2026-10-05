<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\ReactivateOrganizationAction;
use App\Actions\Admin\SuspendOrganizationAction;
use App\Data\Admin\AdminActorData;
use App\Data\Admin\OrganizationReactivationData;
use App\Data\Admin\OrganizationSuspensionData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SuspendOrganizationRequest;
use App\Http\Resources\Admin\AdminOrganizationDetailResource;
use App\Models\Organization;
use App\Models\PlatformAdmin;
use Illuminate\Http\Request;

class OrganizationSuspensionController extends Controller
{
    public function store(SuspendOrganizationRequest $request, Organization $organization, SuspendOrganizationAction $action): AdminOrganizationDetailResource
    {
        /** @var PlatformAdmin $admin */
        $admin = $request->user('admin');

        $action->handle(new OrganizationSuspensionData(
            actor: new AdminActorData($admin->id, $request->ip()),
            organizationId: $organization->id,
            reason: $request->string('reason')->toString(),
        ));

        return new AdminOrganizationDetailResource(
            Organization::query()->withAdminDetail()->findOrFail($organization->id),
        );
    }

    public function destroy(Request $request, Organization $organization, ReactivateOrganizationAction $action): AdminOrganizationDetailResource
    {
        /** @var PlatformAdmin $admin */
        $admin = $request->user('admin');

        $action->handle(new OrganizationReactivationData(
            actor: new AdminActorData($admin->id, $request->ip()),
            organizationId: $organization->id,
        ));

        return new AdminOrganizationDetailResource(
            Organization::query()->withAdminDetail()->findOrFail($organization->id),
        );
    }
}
