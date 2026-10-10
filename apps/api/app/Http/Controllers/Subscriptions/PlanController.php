<?php

declare(strict_types=1);

namespace App\Http\Controllers\Subscriptions;

use App\Http\Controllers\Controller;
use App\Http\Resources\Subscriptions\PlanResource;
use App\Models\Subscription;
use App\Support\CurrentOrganization;
use App\Support\OrganizationPlan;
use Illuminate\Support\Facades\Gate;

class PlanController extends Controller
{
    public function show(CurrentOrganization $currentOrganization, OrganizationPlan $plans): PlanResource
    {
        Gate::authorize('view', Subscription::class);

        return new PlanResource($plans->overview($currentOrganization->getOrFail()));
    }
}
