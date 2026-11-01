<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\Permission;
use App\Models\User;
use App\Support\CurrentOrganization;
use Illuminate\Database\Eloquent\Model;

/**
 * Three layers, in order: 1. tenant (active membership, and the resource's organization_id) denies on mismatch;
 * 2. the org-wide permission allows; 3. its `.own` variant allows when the resource's membership_id is the actor's.
 */
abstract class OrganizationScopedPolicy
{
    protected function allows(User $user, Permission $permission, ?Model $resource = null): bool
    {
        $organizationId = app(CurrentOrganization::class)->get();
        $membership = $user->currentMembership();

        if ($organizationId === null || $membership === null) {
            return false;
        }

        if ($resource !== null && $resource->getAttribute('organization_id') !== $organizationId) {
            return false;
        }

        $effective = $membership->permissions();

        if (in_array($permission, $effective, true)) {
            return true;
        }

        $ownPermission = Permission::tryFrom($permission->value.'.own');

        if ($ownPermission === null || ! in_array($ownPermission, $effective, true)) {
            return false;
        }

        return $resource !== null && $resource->getAttribute('membership_id') === $membership->id;
    }
}
