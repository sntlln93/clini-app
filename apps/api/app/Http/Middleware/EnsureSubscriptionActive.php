<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Enums\SubscriptionStatus;
use App\Exceptions\Subscriptions\SubscriptionInactiveException;
use App\Models\Subscription;
use App\Support\CurrentOrganization;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * The single enforcement point of the read-only restriction (#28): applied
 * to the write routes of appointments, clinical notes, prescriptions,
 * availability and public booking, it rejects the request with a 409 when
 * the current organization's subscription is expired or cancelled. Reads
 * are never wrapped by it.
 *
 * Runs after `organization`/`public-organization`, which populate
 * CurrentOrganization. An organization with no subscription row at all is
 * not restricted (trial policy is a future issue).
 */
class EnsureSubscriptionActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $organizationId = app(CurrentOrganization::class)->get();

        if ($organizationId !== null) {
            $subscription = Subscription::withoutGlobalScope('organization')
                ->where('organization_id', $organizationId)
                ->first();

            /** @var SubscriptionStatus|null $status */
            $status = $subscription?->status;

            if ($status !== null && $status->restrictsWrites()) {
                throw new SubscriptionInactiveException($organizationId, $status);
            }
        }

        return $next($request);
    }
}
