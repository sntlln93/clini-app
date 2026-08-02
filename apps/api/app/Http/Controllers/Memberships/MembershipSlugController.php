<?php

declare(strict_types=1);

namespace App\Http\Controllers\Memberships;

use App\Actions\Memberships\SetMembershipSlugAction;
use App\Data\Memberships\MembershipSlugData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Memberships\UpdateMembershipSlugRequest;
use App\Http\Resources\Memberships\MembershipResource;
use App\Models\Membership;
use App\Models\User;

/**
 * Self-service only: no membership id in the URL, the caller's own active
 * membership in the current organization is resolved from the session
 * (`organization` middleware already guarantees one exists, per
 * ResolveCurrentOrganization / NoActiveMembershipException).
 */
class MembershipSlugController extends Controller
{
    public function update(UpdateMembershipSlugRequest $request, SetMembershipSlugAction $action): MembershipResource
    {
        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $user->currentMembership();

        $updated = $action->handle(new MembershipSlugData(
            membershipId: $membership->id,
            slug: $request->filled('slug') ? $request->string('slug')->toString() : null,
        ));

        return new MembershipResource($updated->load('user'));
    }
}
