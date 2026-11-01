<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\Permission;
use App\Models\User;

/**
 * The practice's own data. Owner and admin, through `organization.manage`.
 */
class OrganizationPolicy extends OrganizationScopedPolicy
{
    /**
     * Where the practice attends (#380).
     */
    public function updateProvince(User $user): bool
    {
        return $this->allows($user, Permission::OrganizationManage);
    }
}
