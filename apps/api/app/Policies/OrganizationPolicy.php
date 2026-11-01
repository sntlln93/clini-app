<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\Permission;
use App\Models\User;

class OrganizationPolicy extends OrganizationScopedPolicy
{
    public function updateProvince(User $user): bool
    {
        return $this->allows($user, Permission::OrganizationManage);
    }
}
