<?php

declare(strict_types=1);

namespace App\Actions\Memberships;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Memberships\MembershipUpdateData;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Membership;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Deactivation is a status change plus a soft delete — never forceDelete,
 * and the membership's appointments are left untouched.
 *
 * The CU-04/CU-05 "organization keeps at least one active owner/admin"
 * invariant is checked and written inside a single transaction, with a row
 * lock over the candidate memberships, so two concurrent deactivations can
 * never both pass the check and leave the organization without one.
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
                throw ValidationException::withMessages([
                    'membership' => ['La organización debe mantener al menos un miembro activo con rol de propietario o administrador.'],
                ]);
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
