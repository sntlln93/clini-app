<?php

declare(strict_types=1);

namespace App\Http\Resources\Booking;

use App\Models\Organization;
use App\Support\OrganizationBranding;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Public-facing shape of an organization — no address or other internal
 * identifiers — plus what its plan shows on the booking page (#239).
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
        $branding = app(OrganizationBranding::class)->of($organization);

        return [
            'name' => $organization->name,
            'slug' => $organization->slug,
            'timezone' => $organization->timezone,
            'show_clini_mark' => $branding->showCliniMark,
            'logo_url' => $branding->logoUrl,
        ];
    }

    private function organization(): Organization
    {
        /** @var Organization $organization */
        $organization = $this->resource;

        return $organization;
    }
}
