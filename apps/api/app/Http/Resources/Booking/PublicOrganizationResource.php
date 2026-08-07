<?php

declare(strict_types=1);

namespace App\Http\Resources\Booking;

use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Public-facing shape of an organization: name, slug and timezone only —
 * no address or other internal identifiers.
 *
 * @mixin Organization
 */
class PublicOrganizationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $organization = $this->organization();

        return [
            'name' => $organization->name,
            'slug' => $organization->slug,
            'timezone' => $organization->timezone,
        ];
    }

    private function organization(): Organization
    {
        /** @var Organization $organization */
        $organization = $this->resource;

        return $organization;
    }
}
