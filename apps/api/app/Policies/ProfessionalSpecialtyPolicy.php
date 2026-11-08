<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\Permission;
use App\Models\Membership;
use App\Models\ProfessionalSpecialty;
use App\Models\User;

class ProfessionalSpecialtyPolicy extends OrganizationScopedPolicy
{
    /**
     * Without the unsaved resource layer 1 (tenant) never runs, and any organization's membership id would authorize.
     */
    public function viewAny(User $user, Membership $membership): bool
    {
        return $this->allows($user, Permission::CatalogView, new ProfessionalSpecialty([
            'organization_id' => $membership->organization_id,
            'membership_id' => $membership->id,
        ]));
    }

    /**
     * An unsaved resource carries the target membership so layers 1 and 3 can resolve.
     */
    public function create(User $user, Membership $membership): bool
    {
        return $this->allows($user, Permission::CatalogManage, new ProfessionalSpecialty([
            'organization_id' => $membership->organization_id,
            'membership_id' => $membership->id,
        ]));
    }

    /**
     * The specialties a professional's verified licenses back (#387): whoever chooses them for the practice, and whoever
     * sees the practice's professionals with their «sin respaldo de matrícula» mark (ADR 0038).
     */
    public function viewBacked(User $user, Membership $membership): bool
    {
        return $this->create($user, $membership) || $this->allows($user, Permission::MembershipsView, $membership);
    }

    public function delete(User $user, ProfessionalSpecialty $professionalSpecialty): bool
    {
        return $this->allows($user, Permission::CatalogManage, $professionalSpecialty);
    }
}
