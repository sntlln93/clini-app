<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\Permission;
use App\Models\Patient;
use App\Models\User;
use App\Support\CurrentOrganization;

/**
 * Patient is global (no organization_id, which the tenant layer would deny on), so allows() takes no resource and
 * isLinked() scopes to the organization. No delete by design: patients are never deleted through this API.
 */
class PatientPolicy extends OrganizationScopedPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->allows($user, Permission::PatientsView);
    }

    public function view(User $user, Patient $patient): bool
    {
        return $this->allows($user, Permission::PatientsView) && $this->isLinked($patient);
    }

    public function create(User $user): bool
    {
        return $this->allows($user, Permission::PatientsCreate);
    }

    public function update(User $user, Patient $patient): bool
    {
        return $this->allows($user, Permission::PatientsUpdate) && $this->isLinked($patient);
    }

    private function isLinked(Patient $patient): bool
    {
        $organizationId = app(CurrentOrganization::class)->get();

        if ($organizationId === null) {
            return false;
        }

        return $patient->organizations()->whereKey($organizationId)->exists();
    }
}
