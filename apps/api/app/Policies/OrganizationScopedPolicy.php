<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\Permission;
use App\Models\User;
use App\Support\CurrentOrganization;
use Illuminate\Database\Eloquent\Model;

/**
 * Three-layer authorization base. Reused as-is by concrete model policies
 * (none exist yet — this issue is infrastructure only); a concrete policy
 * method just delegates to allows() with the org-wide permission it needs
 * and, when it has one, the resource being authorized.
 *
 * Layers, evaluated in order:
 *  1. Tenant check — the user must have an active membership in the
 *     currently active organization, and, when a resource is given, the
 *     resource's own organization_id must match that organization. Either
 *     mismatch denies immediately, before any permission is considered.
 *  2. Org-wide permission — the membership has $permission itself → allow,
 *     regardless of the resource's ownership.
 *  3. Own-scoped permission — the membership has the `.own` variant of
 *     $permission AND the resource's membership_id is the acting
 *     membership's own → allow.
 *
 * Anything else denies.
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
