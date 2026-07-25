<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Enums\MembershipStatus;
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
 * Extension point: a future client-driven organization selector would
 * validate the chosen organization against the user's own memberships
 * here, before falling back to this default.
 */
class ResolveCurrentOrganization
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null) {
            abort(403);
        }

        $membership = $user->memberships()
            ->where('status', MembershipStatus::Active)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->first();

        if ($membership === null) {
            abort(403);
        }

        app(CurrentOrganization::class)->set($membership->organization_id);

        return $next($request);
    }
}
