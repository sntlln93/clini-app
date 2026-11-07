<?php

declare(strict_types=1);

namespace App\Actions\Organizations;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Organizations\OrganizationLogoRemovalData;
use App\Models\OrganizationLogo;
use App\Support\MediaObjectDeletions;
use Illuminate\Support\Facades\DB;

/**
 * Idempotent: removing a missing logo is not an error; returns whether one was removed. The object is not deleted
 * here: it is scheduled for deletion with the row's removal (#410).
 *
 * @implements Action<OrganizationLogoRemovalData>
 */
class RemoveOrganizationLogoAction implements Action
{
    public function __construct(
        private readonly MediaObjectDeletions $deletions,
    ) {}

    /**
     * @param  OrganizationLogoRemovalData  $dto
     */
    public function handle(Data $dto): bool
    {
        return DB::transaction(function () use ($dto): bool {
            $logo = OrganizationLogo::withoutGlobalScope('organization')
                ->where('organization_id', $dto->organizationId)
                ->lockForUpdate()
                ->first();

            if ($logo === null) {
                return false;
            }

            $logo->delete();
            $this->deletions->schedule(OrganizationLogo::DISK, $logo->path);

            return true;
        });
    }
}
