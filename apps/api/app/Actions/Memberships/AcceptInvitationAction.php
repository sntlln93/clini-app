<?php

declare(strict_types=1);

namespace App\Actions\Memberships;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Memberships\InvitationAcceptanceData;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Exceptions\Memberships\InvitationInvalidOrExpiredException;
use App\Jobs\Subscriptions\SyncSubscriptionAmountJob;
use App\Models\Membership;
use App\Models\MembershipInvitation;
use App\Models\Organization;
use App\Models\User;
use App\Support\OrganizationPlan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Invitation validity is already enforced by AcceptInvitationRequest — this only re-checks the organization's suspension and plan (#237) under lock, creates the user/membership and marks the invitation accepted so its token can't be reused.
 *
 * @implements Action<InvitationAcceptanceData>
 */
class AcceptInvitationAction implements Action
{
    public function __construct(
        private readonly OrganizationPlan $plans,
    ) {}

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

            // Re-checked under the organization's row lock, so a suspension
            // committed after AcceptInvitationRequest validated the token
            // can't slip through, and two acceptances can't both pass the
            // plan's professional limit.
            $organization = Organization::query()
                ->whereKey($invitation->organization_id)
                ->lockForUpdate()
                ->first(['id', 'suspended_at']);

            if ($organization?->suspended_at !== null) {
                throw new InvitationInvalidOrExpiredException($invitation->token);
            }

            /** @var array<int, MembershipRole> $roles */
            $roles = $invitation->roles;

            $this->plans->ensureAllowsMember($invitation->organization_id, $roles);

            $user = User::where('email', $invitation->email)->first();

            if ($user === null) {
                $user = User::create([
                    'name' => $dto->name,
                    'email' => $invitation->email,
                    'password' => Hash::make((string) $dto->password),
                ]);
            }

            $membership = Membership::create([
                'organization_id' => $invitation->organization_id,
                'user_id' => $user->id,
                'roles' => $roles,
                'status' => MembershipStatus::Active,
            ]);

            $invitation->update(['accepted_at' => now()]);

            if (in_array(MembershipRole::Professional, $roles, true)) {
                SyncSubscriptionAmountJob::dispatch($invitation->organization_id);
            }

            return $membership;
        });
    }
}
