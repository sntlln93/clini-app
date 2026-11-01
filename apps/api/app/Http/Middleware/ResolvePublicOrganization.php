<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Exceptions\Booking\BookingLinkNotFoundException;
use App\Exceptions\Booking\BookingOrganizationUnavailableException;
use App\Models\Membership;
use App\Models\Organization;
use App\Support\CurrentOrganization;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * {slug} is the only signal: an organization's slug first, then an active
 * professional's own, whose membership the controller preselects.
 */
class ResolvePublicOrganization
{
    public function handle(Request $request, Closure $next): Response
    {
        $slug = (string) $request->route('slug');

        $organization = Organization::where('slug', $slug)->first();

        if ($organization !== null) {
            if ($organization->suspended_at !== null) {
                throw new BookingOrganizationUnavailableException($organization->id);
            }

            app(CurrentOrganization::class)->set($organization->id);

            return $next($request);
        }

        // `roles` is an EnumArrayCast column, not filterable in SQL.
        $membership = Membership::withoutGlobalScope('organization')
            ->where('slug', $slug)
            ->where('status', MembershipStatus::Active)
            ->get()
            ->first(function (Membership $membership): bool {
                /** @var array<int, MembershipRole> $roles */
                $roles = $membership->roles;

                return in_array(MembershipRole::Professional, $roles, true);
            });

        if ($membership === null) {
            throw new BookingLinkNotFoundException;
        }

        $membershipOrganization = Organization::query()->find($membership->organization_id);

        if ($membershipOrganization?->suspended_at !== null) {
            throw new BookingOrganizationUnavailableException($membershipOrganization->id);
        }

        app(CurrentOrganization::class)->set($membership->organization_id);
        $request->attributes->set('public_membership_id', $membership->id);

        return $next($request);
    }
}
