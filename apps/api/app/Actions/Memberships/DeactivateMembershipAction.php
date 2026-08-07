<?php

declare(strict_types=1);

namespace App\Actions\Memberships;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Memberships\MembershipUpdateData;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Exceptions\Memberships\LastActiveAdminException;
use App\Models\Membership;
use Illuminate\Support\Facades\DB;

/**
 * Deactivation is a soft delete (never forceDelete) — appointments are left untouched.
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
            $membership = Membership::lockForUpdate()->findOrFail($dto->membershipId);

            /** @var array<int, MembershipRole> $roles */
            $roles = $membership->roles;

            $isOwnerOrAdmin = collect($roles)->contains(
                fn (MembershipRole $role): bool => in_array($role, [MembershipRole::Owner, MembershipRole::Admin], true)
            );

            /** @var MembershipStatus $status */
            $status = $membership->status;

            if ($status === MembershipStatus::Active && $isOwnerOrAdmin && ! $this->anotherActiveOwnerOrAdminExists($membership)) {
                throw new LastActiveAdminException($membership->id, $membership->organization_id);
            }

            $membership->update([
                'roles' => $dto->roles,
                'status' => $dto->status,
            ]);

            $membership->delete();

            return $membership;
        });
    }

    private function anotherActiveOwnerOrAdminExists(Membership $membership): bool
    {
        return Membership::query()
            ->where('id', '!=', $membership->id)
            ->where('status', MembershipStatus::Active)
            ->lockForUpdate()
            ->get()
            ->contains(function (Membership $other): bool {
                /** @var array<int, MembershipRole> $roles */
                $roles = $other->roles;

                return collect($roles)->contains(
                    fn (MembershipRole $role): bool => in_array($role, [MembershipRole::Owner, MembershipRole::Admin], true)
                );
            });
    }
}
