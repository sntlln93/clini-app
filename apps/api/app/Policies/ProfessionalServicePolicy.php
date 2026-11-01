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
     * Without the unsaved resource layer 1 (tenant) never runs, and any organization's membership id would authorize.
     */
    public function viewAny(User $user, Membership $membership): bool
    {
        return $this->allows($user, Permission::CatalogView, new ProfessionalService([
            'organization_id' => $membership->organization_id,
            'membership_id' => $membership->id,
        ]));
    }

    /**
     * An unsaved resource carries the target membership so layers 1 and 3 can resolve.
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
