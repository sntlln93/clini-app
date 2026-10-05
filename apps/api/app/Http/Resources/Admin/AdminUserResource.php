<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * User list item. Expects `memberships_count` (withCount over live
 * memberships of live organizations).
 *
 * @mixin User
 */
class AdminUserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $this->user();

        /** @var CarbonImmutable|null $blockedAt */
        $blockedAt = $user->blocked_at;

        $membershipsCount = $user->getAttribute('memberships_count');

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'email_verified_at' => $user->email_verified_at?->toIso8601String(),
            'blocked_at' => $blockedAt?->toIso8601String(),
            'block_reason' => $user->block_reason,
            'created_at' => $user->created_at?->toIso8601String(),
            'memberships_count' => is_numeric($membershipsCount) ? (int) $membershipsCount : 0,
        ];
    }

    protected function user(): User
    {
        /** @var User $user */
        $user = $this->resource;

        return $user;
    }
}
