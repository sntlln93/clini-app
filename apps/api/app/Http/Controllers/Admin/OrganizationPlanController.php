<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\AssignOrganizationPlanAction;
use App\Data\Admin\AdminActorData;
use App\Data\Admin\OrganizationPlanAssignmentData;
use App\Enums\Plan;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AssignOrganizationPlanRequest;
use App\Http\Resources\Admin\AdminOrganizationDetailResource;
use App\Models\Organization;
use App\Models\PlatformAdmin;

class OrganizationPlanController extends Controller
{
    public function update(AssignOrganizationPlanRequest $request, Organization $organization, AssignOrganizationPlanAction $action): AdminOrganizationDetailResource
    {
        /** @var PlatformAdmin $admin */
        $admin = $request->user('admin');

        $action->handle(new OrganizationPlanAssignmentData(
            actor: new AdminActorData($admin->id, $request->ip()),
            organizationId: $organization->id,
            assignedPlan: $request->filled('assigned_plan') ? Plan::from($request->string('assigned_plan')->toString()) : null,
            reason: $request->string('reason')->toString(),
        ));

        return new AdminOrganizationDetailResource(
            Organization::query()->withAdminDetail()->findOrFail($organization->id),
        );
    }
}
