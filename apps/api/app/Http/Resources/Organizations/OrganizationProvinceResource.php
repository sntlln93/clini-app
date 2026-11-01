<?php

declare(strict_types=1);

namespace App\Http\Resources\Organizations;

use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Where the practice attends (#380).
 *
 * @mixin Organization
 */
class OrganizationProvinceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var Organization $organization */
        $organization = $this->resource;

        return [
            'province' => $organization->province?->value,
        ];
    }
}
