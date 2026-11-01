<?php

declare(strict_types=1);

namespace App\Actions\Memberships;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Memberships\MembershipUpdateData;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Exceptions\Memberships\LastActiveAdminException;
use App\Jobs\Subscriptions\SyncSubscriptionAmountJob;
use App\Models\Membership;
use App\Support\OrganizationAdministrators;
use Illuminate\Support\Facades\DB;

/**
 * Deactivation is a soft delete (never forceDelete) — appointments are left untouched. Works with no current
 * organization too: account deletion (#384) deactivates the user's memberships in every organization.
 *
 * The CU-04/CU-05 "keep at least one active owner/admin" invariant is checked and written inside a single row-locked transaction so two concurrent deactivations can't both pass and leave none.
 *
 * @implements Action<MembershipUpdateData>
 */
class DeactivateMembershipAction implements Action
{
    /**
     * @param  MembershipUpdateData  $dto
     */
    public function handle(Data $dto): Membership
    {
        return DB::transaction(function () use ($dto): Membership {
            $membership = Membership::withoutGlobalScope('organization')->lockForUpdate()->findOrFail($dto->membershipId);

            /** @var array<int, MembershipRole> $roles */
            $roles = $membership->roles;

            $isOwnerOrAdmin = OrganizationAdministrators::includesOwnerOrAdmin($roles);

            /** @var MembershipStatus $status */
            $status = $membership->status;

            if ($status === MembershipStatus::Active && $isOwnerOrAdmin && ! OrganizationAdministrators::anotherActiveExists($membership)) {
                throw new LastActiveAdminException($membership->id, $membership->organization_id);
            }

            $membership->update([
                'roles' => $dto->roles,
                'status' => $dto->status,
            ]);

            $membership->delete();

            if ($status === MembershipStatus::Active && in_array(MembershipRole::Professional, $roles, true)) {
                SyncSubscriptionAmountJob::dispatch($membership->organization_id);
            }

            return $membership;
        });
    }
}
