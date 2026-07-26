<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\Permission;
use App\Models\Membership;
use App\Models\User;

class MembershipPolicy extends OrganizationScopedPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->allows($user, Permission::MembershipsView);
    }

    public function view(User $user, Membership $membership): bool
    {
        return $this->allows($user, Permission::MembershipsView, $membership);
    }

    public function update(User $user, Membership $membership): bool
    {
        return $this->allows($user, Permission::MembershipsManage, $membership);
    }

    public function delete(User $user, Membership $membership): bool
    {
        return $this->allows($user, Permission::MembershipsManage, $membership);
    }
}
