<?php

declare(strict_types=1);

namespace App\Http\Resources\Auth;

use App\Enums\MembershipStatus;
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
        return $this->user()->memberships()
            ->where('status', MembershipStatus::Active)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->first();
    }
}
