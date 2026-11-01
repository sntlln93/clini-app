<?php

declare(strict_types=1);

namespace App\Support;

use App\Data\Organizations\BookingBrandingData;
use App\Enums\PlanFeature;
use App\Models\Organization;
use App\Models\OrganizationLogo;

final class OrganizationBranding
{
    public function __construct(
        private readonly OrganizationPlan $plans,
    ) {}

    public function of(Organization $organization): BookingBrandingData
    {
        if (! $this->plans->of($organization->id)->includes(PlanFeature::BookingBranding)) {
            return new BookingBrandingData(showCliniMark: true, logoUrl: null);
        }

        // Its public routes answer 403, so a mail would only carry a broken image.
        if ($organization->isSuspended()) {
            return new BookingBrandingData(showCliniMark: false, logoUrl: null);
        }

        $logo = OrganizationLogo::withoutGlobalScope('organization')
            ->where('organization_id', $organization->id)
            ->first(['id', 'organization_id', 'checksum']);

        return new BookingBrandingData(
            showCliniMark: false,
            logoUrl: $logo === null ? null : $this->logoUrl($organization, $logo),
        );
    }

    /**
     * From APP_URL, not the request: queued mails have none, and it stays https behind an untrusted proxy.
     */
    public function logoUrl(Organization $organization, OrganizationLogo $logo): string
    {
        /** @var string $appUrl */
        $appUrl = config('app.url');

        return rtrim($appUrl, '/')."/api/v1/booking/{$organization->slug}/logo?v=".substr($logo->checksum, 0, 16);
    }
}
