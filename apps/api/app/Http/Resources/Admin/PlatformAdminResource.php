<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Models\PlatformAdmin;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin PlatformAdmin
 */
class PlatformAdminResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var PlatformAdmin $admin */
        $admin = $this->resource;

        /** @var CarbonImmutable|null $lastLoginAt */
        $lastLoginAt = $admin->last_login_at;

        return [
            'id' => $admin->id,
            'name' => $admin->name,
            'email' => $admin->email,
            'last_login_at' => $lastLoginAt?->toIso8601String(),
        ];
    }
}
