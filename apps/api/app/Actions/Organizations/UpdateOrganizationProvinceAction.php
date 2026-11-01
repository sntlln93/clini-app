<?php

declare(strict_types=1);

namespace App\Actions\Organizations;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Organizations\OrganizationProvinceData;
use App\Models\Organization;

/**
 * Declares where the practice attends (#380): the license of each professional that counts there is the one from this
 * province, and its provincial holidays close the booking page.
 *
 * @implements Action<OrganizationProvinceData>
 */
class UpdateOrganizationProvinceAction implements Action
{
    /**
     * @param  OrganizationProvinceData  $dto
     */
    public function handle(Data $dto): Organization
    {
        $organization = Organization::query()->findOrFail($dto->organizationId);

        $organization->forceFill(['province' => $dto->province])->save();

        return $organization;
    }
}
