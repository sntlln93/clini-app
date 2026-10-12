<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\Permission;
use App\Models\User;

/**
 * Owner and admin, through `organization.manage` (#291).
 */
class AcceptedInsuranceProviderPolicy extends OrganizationScopedPolicy
{
    public function manage(User $user): bool
    {
        return $this->allows($user, Permission::OrganizationManage);
    }
}
