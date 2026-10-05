<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Enums\MembershipStatus;
use App\Exceptions\Organizations\NoActiveMembershipException;
use App\Exceptions\Organizations\OrganizationSuspendedException;
use App\Models\Organization;
use App\Models\User;
use App\Support\CurrentOrganization;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the active organization for the authenticated user from their
 * own active membership and populates App\Support\CurrentOrganization for
 * the rest of the request lifecycle.
 *
 * The organization is never informed by the client — no header, no query
 * or route parameter influences this resolution. When a user has several
 * active memberships, the most recently created one wins, deterministically.
 *
 * When that organization was suspended by a platform operator the request
 * is rejected with 403 `organizations.suspended` — there is no fallback to
 * another of the user's organizations, so resolution stays deterministic
 * and identical to the one SessionUserResource reports on `/me`.
 *
 * Extension point: a future client-driven organization selector would
 * validate the chosen organization against the user's own memberships
 * here, before falling back to this default.
 */
class ResolveCurrentOrganization
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // `auth:sanctum` only ever resolves a clinic User here.
        if (! $user instanceof User) {
            abort(403);
        }

        $membership = $user->memberships()
            ->where('status', MembershipStatus::Active)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->first();

        if ($membership === null) {
            throw new NoActiveMembershipException($user->id);
        }

        $organization = Organization::query()->find($membership->organization_id);

        if ($organization?->suspended_at !== null) {
            throw new OrganizationSuspendedException($organization->id);
        }

        app(CurrentOrganization::class)->set($membership->organization_id);

        return $next($request);
    }
}
