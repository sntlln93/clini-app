<?php

declare(strict_types=1);

namespace App\Http\Resources\Memberships;

use App\Models\Membership;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Membership
 */
class MembershipResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $membership = $this->membership();

        return [
            'id' => $membership->id,
            'user' => [
                'id' => $membership->user?->id,
                'name' => $membership->user?->name,
                'email' => $membership->user?->email,
            ],
            'roles' => $membership->roles,
            'status' => $membership->status,
            'deleted_at' => $membership->deleted_at,
            'created_at' => $membership->created_at,
            'updated_at' => $membership->updated_at,
        ];
    }

    private function membership(): Membership
    {
        /** @var Membership $membership */
        $membership = $this->resource;

        return $membership;
    }
}
