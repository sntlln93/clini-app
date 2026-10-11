<?php

declare(strict_types=1);

namespace App\Actions\Organizations;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Organizations\OrganizationLogoData;
use App\Enums\PlanFeature;
use App\Models\OrganizationLogo;
use App\Support\OrganizationPlan;

/**
 * Uploading a logo is a paid-plan function (#239); removing it never is.
 *
 * @implements Action<OrganizationLogoData>
 */
class StoreOrganizationLogoAction implements Action
{
    public function __construct(
        private readonly OrganizationPlan $plans,
    ) {}

    /**
     * @param  OrganizationLogoData  $dto
     */
    public function handle(Data $dto): OrganizationLogo
    {
        $this->plans->ensureIncludes($dto->organizationId, PlanFeature::BookingBranding);

        return OrganizationLogo::withoutGlobalScope('organization')->updateOrCreate(
            ['organization_id' => $dto->organizationId],
            [
                'mime_type' => $dto->mimeType,
                'content' => base64_encode($dto->contents),
                'checksum' => hash('sha256', $dto->contents),
            ],
        );
    }
}
