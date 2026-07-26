<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\Permission;
use App\Models\Membership;
use App\Models\ProfessionalService;
use App\Models\User;

class ProfessionalServicePolicy extends OrganizationScopedPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->allows($user, Permission::CatalogView);
    }

    /**
     * There is no persisted resource yet at create time, so an unsaved
     * ProfessionalService carrying the target membership's
     * organization_id/membership_id is passed to allows() so layer 3
     * (own-scoped) still resolves correctly.
     */
    public function create(User $user, Membership $membership): bool
    {
        return $this->allows($user, Permission::CatalogManage, new ProfessionalService([
            'organization_id' => $membership->organization_id,
            'membership_id' => $membership->id,
        ]));
    }

    public function update(User $user, ProfessionalService $professionalService): bool
    {
        return $this->allows($user, Permission::CatalogManage, $professionalService);
    }

    public function delete(User $user, ProfessionalService $professionalService): bool
    {
        return $this->allows($user, Permission::CatalogManage, $professionalService);
    }
}
