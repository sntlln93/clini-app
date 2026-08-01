<?php

declare(strict_types=1);

namespace App\Http\Middleware;

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
 * No session, no membership, no header: the slug is the only signal. A slug
 * that matches no organization throws ModelNotFoundException, which the
 * framework converts into a plain 404 before it ever reaches a controller.
 */
class ResolvePublicOrganization
{
    public function handle(Request $request, Closure $next): Response
    {
        $slug = (string) $request->route('slug');

        $organization = Organization::where('slug', $slug)->firstOrFail();

        app(CurrentOrganization::class)->set($organization->id);

        return $next($request);
    }
}
