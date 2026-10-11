<?php

declare(strict_types=1);

namespace App\Actions\Organizations;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Organizations\OrganizationLogoRemovalData;
use App\Models\OrganizationLogo;

/**
 * Idempotent: removing a missing logo is not an error; returns whether one was removed.
 *
 * @implements Action<OrganizationLogoRemovalData>
 */
class RemoveOrganizationLogoAction implements Action
{
    /**
     * @param  OrganizationLogoRemovalData  $dto
     */
    public function handle(Data $dto): bool
    {
        return OrganizationLogo::withoutGlobalScope('organization')
            ->where('organization_id', $dto->organizationId)
            ->delete() > 0;
    }
}
