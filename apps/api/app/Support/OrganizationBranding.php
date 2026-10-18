<?php

declare(strict_types=1);

namespace App\Support;

use App\Data\Organizations\BookingBrandingData;
use App\Enums\PlanFeature;
use App\Models\Organization;
use App\Models\OrganizationLogo;

/**
 * What the booking page and the reminder mail show (#239): the Clini mark
 * on a plan without BookingBranding, the organization's logo otherwise.
 * A logo uploaded before a downgrade is kept but not shown (ADR 0015).
 */
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

        // Its public routes answer 403 (ResolvePublicOrganization), so a mail
        // would only carry a broken image.
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
     * Absolute, so a mail client can load it, and built from APP_URL rather
     * than the request: the reminder mail renders in a queued job, with no
     * request, and the URL stays https even when the TLS-terminating proxy
     * isn't in TRUSTED_PROXIES. The checksum busts caches when the logo is
     * replaced.
     */
    public function logoUrl(Organization $organization, OrganizationLogo $logo): string
    {
        /** @var string $appUrl */
        $appUrl = config('app.url');

        return rtrim($appUrl, '/')."/api/v1/booking/{$organization->slug}/logo?v=".substr($logo->checksum, 0, 16);
    }
}
