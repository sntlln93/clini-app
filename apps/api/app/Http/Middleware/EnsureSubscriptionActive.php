<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Enums\SubscriptionStatus;
use App\Exceptions\Subscriptions\SubscriptionInactiveException;
use App\Models\Subscription;
use App\Support\CurrentOrganization;
use App\Support\OrganizationPlan;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * The single enforcement point of the read-only restriction: applied to the
 * write routes of appointments, clinical notes, prescriptions, availability
 * and public booking, it rejects the request with a 409 when the current
 * organization's subscription expired (#28), or when it has more active
 * professionals than its plan allows (#237). Reads are never wrapped by it.
 *
 * Runs after `organization`/`public-organization`, which populate
 * CurrentOrganization.
 */
class EnsureSubscriptionActive
{
    public function __construct(
        private readonly OrganizationPlan $plans,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $organizationId = app(CurrentOrganization::class)->get();

        if ($organizationId !== null) {
            $subscription = Subscription::withoutGlobalScope('organization')
                ->where('organization_id', $organizationId)
                ->first();

            if ($subscription !== null && $subscription->restrictsWrites()) {
                /** @var SubscriptionStatus $status */
                $status = $subscription->status;

                throw new SubscriptionInactiveException($organizationId, $status);
            }

            $this->plans->ensureWithinProfessionalLimit($organizationId);
        }

        return $next($request);
    }
}
