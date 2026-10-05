<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Models\PlatformAdmin;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The `AdminRef` mini-shape (platform-admins list, audit rows).
 *
 * @mixin PlatformAdmin
 */
class AdminRefResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var PlatformAdmin $admin */
        $admin = $this->resource;

        return [
            'id' => $admin->id,
            'name' => $admin->name,
            'email' => $admin->email,
        ];
    }
}
