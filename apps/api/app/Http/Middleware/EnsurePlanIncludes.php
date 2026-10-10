<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Enums\PlanFeature;
use App\Support\CurrentOrganization;
use App\Support\OrganizationPlan;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * `plan.feature:<feature>`: rejects the route with 409
 * `plans.feature_unavailable` when the current organization's plan leaves
 * the PlanFeature out (#237). Runs after `organization`.
 */
class EnsurePlanIncludes
{
    public function __construct(
        private readonly OrganizationPlan $plans,
    ) {}

    public function handle(Request $request, Closure $next, string $feature): Response
    {
        $organizationId = app(CurrentOrganization::class)->get();

        if ($organizationId !== null) {
            $this->plans->ensureIncludes($organizationId, PlanFeature::from($feature));
        }

        return $next($request);
    }
}
