<?php

declare(strict_types=1);

namespace App\Http\Resources\Auth;

use App\Enums\MembershipStatus;
use App\Http\Resources\Memberships\MembershipResource;
use App\Models\Membership;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Additive session payload: user fields plus active organization, roles
 * and permissions. Resolves membership independently of the `organization`
 * middleware since /me sits outside that group.
 *
 * @mixin User
 */
class SessionUserResource extends JsonResource
{
    /**
     * Disable the default `data` envelope to stay additive over the previous flat /me payload.
     *
     * @var string|null
     */
    public static $wrap = null;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $membership = $this->latestActiveMembership();

        return array_merge($this->user()->toArray(), [
            'organization' => $membership?->organization,
            'roles' => $membership !== null ? $membership->roles : [],
            'permissions' => $membership !== null
                ? array_map(fn ($permission): string => $permission->value, $membership->permissions())
                : [],
            'membership' => $membership !== null ? new MembershipResource($membership) : null,
        ]);
    }

    private function user(): User
    {
        /** @var User $user */
        $user = $this->resource;

        return $user;
    }

    private function latestActiveMembership(): ?Membership
    {
        $membership = $this->user()->memberships()
            ->where('status', MembershipStatus::Active)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->first();

        // The membership is fetched from the user's own `memberships()` query, so its
        // inverse `user` relation isn't set — reuse the already-loaded user to avoid a
        // lazy-loaded query when MembershipResource reads `$membership->user`.
        return $membership?->setRelation('user', $this->user());
    }
}
