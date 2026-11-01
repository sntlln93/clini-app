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
 * Never informed by the client: the newest active membership wins, with no
 * fallback when its organization is suspended, so it matches what
 * SessionUserResource reports on `/me`.
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
