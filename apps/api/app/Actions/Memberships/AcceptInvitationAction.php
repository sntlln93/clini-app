<?php

declare(strict_types=1);

namespace App\Actions\Memberships;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Memberships\InvitationAcceptanceData;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Exceptions\Memberships\InvitationInvalidOrExpiredException;
use App\Models\Membership;
use App\Models\MembershipInvitation;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Invitation validity is already enforced by AcceptInvitationRequest — this only re-checks the organization's suspension under lock, creates the user/membership and marks the invitation accepted so its token can't be reused.
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

            // Re-checked under a shared lock so a suspension committed after
            // AcceptInvitationRequest validated the token can't slip through
            // (SuspendOrganizationAction locks the row for update).
            $organization = Organization::query()
                ->whereKey($invitation->organization_id)
                ->sharedLock()
                ->first(['id', 'suspended_at']);

            if ($organization?->suspended_at !== null) {
                throw new InvitationInvalidOrExpiredException($invitation->token);
            }

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
