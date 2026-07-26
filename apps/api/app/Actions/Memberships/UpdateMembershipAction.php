<?php

declare(strict_types=1);

namespace App\Actions\Memberships;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Memberships\MembershipUpdateData;
use App\Models\Membership;

/**
 * @implements Action<MembershipUpdateData>
 */
class UpdateMembershipAction implements Action
{
    /**
     * @param  MembershipUpdateData  $dto
     */
    public function handle(Data $dto): Membership
    {
        $membership = Membership::findOrFail($dto->membershipId);

        $membership->update([
            'roles' => $dto->roles,
            'status' => $dto->status,
        ]);

        return $membership;
    }
}
