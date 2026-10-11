<?php

declare(strict_types=1);

namespace App\Actions\Organizations;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Organizations\OrganizationLogoRemovalData;
use App\Models\OrganizationLogo;
use Illuminate\Support\Facades\Storage;

/**
 * Idempotent: removing a missing logo is not an error; returns whether one was
 * removed. The row goes first, so a storage failure leaves an orphan object
 * rather than a row pointing at nothing.
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
        $logo = OrganizationLogo::withoutGlobalScope('organization')
            ->where('organization_id', $dto->organizationId)
            ->first();

        if ($logo === null) {
            return false;
        }

        $logo->delete();
        Storage::disk(OrganizationLogo::DISK)->delete($logo->path);

        return true;
    }
}
