<?php

declare(strict_types=1);

namespace App\Http\Controllers\Organizations;

use App\Http\Controllers\Controller;
use App\Http\Resources\Organizations\OrganizationSetupResource;
use App\Models\Membership;
use App\Support\CurrentOrganization;
use App\Support\OrganizationSetup;
use Illuminate\Support\Facades\Gate;

/** The panel's «Primeros pasos» checklist (#286). */
class OrganizationSetupController extends Controller
{
    public function show(CurrentOrganization $currentOrganization, OrganizationSetup $setup): OrganizationSetupResource
    {
        Gate::authorize('viewSetup', Membership::class);

        return new OrganizationSetupResource($setup->progress($currentOrganization->getOrFail()));
    }
}
