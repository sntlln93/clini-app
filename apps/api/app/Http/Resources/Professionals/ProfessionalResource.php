<?php

declare(strict_types=1);

namespace App\Http\Resources\Professionals;

use App\Models\Membership;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Roster shape for agenda/availability consumers: deliberately excludes
 * membership-management fields (roles, status, slug, deleted_at,
 * created_at, updated_at) — see ProfessionalController.
 */
class ProfessionalResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var Membership $membership */
        $membership = $this->resource;

        return [
            'id' => $membership->id,
            'user' => [
                'id' => $membership->user?->id,
                'name' => $membership->user?->name,
                'email' => $membership->user?->email,
            ],
        ];
    }
}
