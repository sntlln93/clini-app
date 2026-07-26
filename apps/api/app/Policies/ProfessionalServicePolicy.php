<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\Permission;
use App\Models\Membership;
use App\Models\ProfessionalService;
use App\Models\User;

class ProfessionalServicePolicy extends OrganizationScopedPolicy
{
    /**
     * There is no persisted resource to check here either, so the same
     * unsaved-resource trick as create() is used: without it, layer 1 (the
     * tenant check) never runs and any membership id from any organization
     * would authorize.
     */
    public function viewAny(User $user, Membership $membership): bool
    {
        return $this->allows($user, Permission::CatalogView, new ProfessionalService([
            'organization_id' => $membership->organization_id,
            'membership_id' => $membership->id,
        ]));
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
