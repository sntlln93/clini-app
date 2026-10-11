<?php

declare(strict_types=1);

namespace App\Http\Resources\Organizations;

use App\Models\Organization;
use App\Support\OrganizationBranding;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The stored logo whatever the plan, so the panel can show (and remove) one
 * kept after a downgrade. Needs `logo` loaded.
 *
 * @mixin Organization
 */
class OrganizationLogoResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var Organization $organization */
        $organization = $this->resource;
        $logo = $organization->logo;

        return [
            'logo_url' => $logo === null ? null : app(OrganizationBranding::class)->logoUrl($organization, $logo),
        ];
    }
}
