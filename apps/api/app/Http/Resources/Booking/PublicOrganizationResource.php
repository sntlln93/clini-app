<?php

declare(strict_types=1);

namespace App\Http\Resources\Booking;

use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Public-facing shape of an organization for the online booking page: name,
 * slug and timezone only — no address, no internal identifiers beyond what
 * the panel's own booking types need.
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
