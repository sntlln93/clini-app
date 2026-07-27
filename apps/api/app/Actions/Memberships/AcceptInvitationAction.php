<?php

declare(strict_types=1);

namespace App\Actions\Memberships;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Memberships\InvitationAcceptanceData;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Membership;
use App\Models\MembershipInvitation;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * The invitation's validity (existence, expiry, single use) is already
 * enforced by AcceptInvitationRequest before this runs — this action only
 * creates the user (when needed) and the resulting membership, and marks
 * the invitation as accepted so the token can never be reused.
 *
 * @implements Action<InvitationAcceptanceData>
 */
class AcceptInvitationAction implements Action
{
    /**
     * @param  InvitationAcceptanceData  $dto
     */
    public function handle(Data $dto): Membership
    {
        return DB::transaction(function () use ($dto): Membership {
            $invitation = MembershipInvitation::query()
                ->where('token', hash('sha256', $dto->token))
                ->whereNull('accepted_at')
                ->lockForUpdate()
                ->firstOrFail();

            $user = User::where('email', $invitation->email)->first();

            if ($user === null) {
                $user = User::create([
                    'name' => $dto->name,
                    'email' => $invitation->email,
                    'password' => Hash::make((string) $dto->password),
                ]);
            }

            /** @var array<int, MembershipRole> $roles */
            $roles = $invitation->roles;

            $membership = Membership::create([
                'organization_id' => $invitation->organization_id,
                'user_id' => $user->id,
                'roles' => $roles,
                'status' => MembershipStatus::Active,
            ]);

            $invitation->update(['accepted_at' => now()]);

            return $membership;
        });
    }
}
