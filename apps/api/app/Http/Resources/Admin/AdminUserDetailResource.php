<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;

/**
 * User detail: list fields plus memberships with their organization.
 * Expects `memberships.organization` (live memberships of live
 * organizations, newest first) and `memberships_count` to be loaded — see
 * User::scopeWithAdminDetail().
 *
 * @mixin User
 */
class AdminUserDetailResource extends AdminUserResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return array_merge(parent::toArray($request), [
            'memberships' => $this->user()->memberships
                ->map(fn (Membership $membership): array => $this->membership($membership))
                ->values()
                ->all(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function membership(Membership $membership): array
    {
        /** @var Organization $organization */
        $organization = $membership->organization;

        /** @var array<int, MembershipRole> $roles */
        $roles = $membership->roles;

        /** @var MembershipStatus $status */
        $status = $membership->status;

        /** @var CarbonImmutable|null $suspendedAt */
        $suspendedAt = $organization->suspended_at;

        return [
            'id' => $membership->id,
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'slug' => $organization->slug,
                'suspended_at' => $suspendedAt?->toIso8601String(),
            ],
            'roles' => array_map(fn (MembershipRole $role): string => $role->value, $roles),
            'status' => $status->value,
            'created_at' => $membership->created_at?->toIso8601String(),
        ];
    }
}
