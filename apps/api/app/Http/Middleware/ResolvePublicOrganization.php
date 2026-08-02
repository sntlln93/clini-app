<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Enums\MembershipStatus;
use App\Models\Membership;
use App\Models\Organization;
use App\Support\CurrentOrganization;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the organization for a public booking request from the {slug}
 * route parameter and populates App\Support\CurrentOrganization for the
 * rest of the request lifecycle — the public counterpart of
 * ResolveCurrentOrganization, which resolves from the authenticated user's
 * own active membership instead.
 *
 * Two-step resolution: {slug} is tried first against organizations.slug,
 * then against an active professional membership's own public slug (#32).
 * On a membership hit, the membership's organization becomes current and
 * the membership itself is recorded on the request for the controller to
 * use for preselection. No session, no header: the slug is the only
 * signal. A slug that matches neither throws ModelNotFoundException, which
 * the framework converts into a plain 404 before it ever reaches a
 * controller.
 */
class ResolvePublicOrganization
{
    public function handle(Request $request, Closure $next): Response
    {
        $slug = (string) $request->route('slug');

        $organization = Organization::where('slug', $slug)->first();

        if ($organization !== null) {
            app(CurrentOrganization::class)->set($organization->id);

            return $next($request);
        }

        $membership = Membership::withoutGlobalScope('organization')
            ->where('slug', $slug)
            ->where('status', MembershipStatus::Active)
            ->firstOrFail();

        app(CurrentOrganization::class)->set($membership->organization_id);
        $request->attributes->set('public_membership_id', $membership->id);

        return $next($request);
    }
}
