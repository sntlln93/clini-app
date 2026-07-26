<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\Permission;
use App\Models\Membership;
use App\Models\ProfessionalSpecialty;
use App\Models\User;

class ProfessionalSpecialtyPolicy extends OrganizationScopedPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->allows($user, Permission::CatalogView);
    }

    /**
     * There is no persisted resource yet at create time, so an unsaved
     * ProfessionalSpecialty carrying the target membership's
     * organization_id/membership_id is passed to allows() so layer 3
     * (own-scoped) still resolves correctly.
     */
    public function create(User $user, Membership $membership): bool
    {
        return $this->allows($user, Permission::CatalogManage, new ProfessionalSpecialty([
            'organization_id' => $membership->organization_id,
            'membership_id' => $membership->id,
        ]));
    }

    public function delete(User $user, ProfessionalSpecialty $professionalSpecialty): bool
    {
        return $this->allows($user, Permission::CatalogManage, $professionalSpecialty);
    }
}
