<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\Permission;
use App\Models\Patient;
use App\Models\User;
use App\Support\CurrentOrganization;

/**
 * Patient is a global model with no organization_id, so it can never be
 * passed as the $resource to OrganizationScopedPolicy::allows() — the base
 * policy's tenant check reads that attribute and would deny every call.
 * Every method here therefore calls allows() with no resource and adds its
 * own pivot-membership check (isLinked()) where visibility must be scoped
 * to the active organization.
 *
 * There is no delete method by design: patients are never deleted through
 * this API.
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
