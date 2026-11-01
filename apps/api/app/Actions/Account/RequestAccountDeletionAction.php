<?php

declare(strict_types=1);

namespace App\Actions\Account;

use App\Actions\Auth\VerifyTwoFactorChallengeAction;
use App\Actions\Memberships\DeactivateMembershipAction;
use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Account\AccountDeletionRequestData;
use App\Data\Auth\TwoFactorChallengeData;
use App\Data\Memberships\MembershipUpdateData;
use App\Enums\AccountDeletionStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Mail\Account\AccountDeletionRequestedMail;
use App\Models\AccountDeletionRequest;
use App\Models\Membership;
use App\Models\User;
use App\Support\AccountDeletionRules;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

/**
 * Opens the grace period of a clinic user's own account deletion (#384, ADR 0034): checks the second factor, refuses
 * while the user is the last owner or admin of an organization or has appointments to attend, deactivates every
 * membership (so no appointment comes in meanwhile) remembering each one's status, and mails the date. All in one
 * transaction: a refusal also gives back a recovery code it spent.
 *
 * @implements Action<AccountDeletionRequestData>
 */
class RequestAccountDeletionAction implements Action
{
    public function __construct(
        private readonly VerifyTwoFactorChallengeAction $verifyTwoFactor,
        private readonly DeactivateMembershipAction $deactivate,
    ) {}

    /**
     * @param  AccountDeletionRequestData  $dto
     */
    public function handle(Data $dto): AccountDeletionRequest
    {
        return DB::transaction(function () use ($dto): AccountDeletionRequest {
            $user = User::query()->lockForUpdate()->findOrFail($dto->user->id);

            if ($user->hasTwoFactorEnabled()) {
                $this->verifyTwoFactor->handle(new TwoFactorChallengeData($user, $dto->code, $dto->recoveryCode));
            }

            $memberships = Membership::withoutGlobalScope('organization')
                ->where('user_id', $user->id)
                ->orderByDesc('created_at')
                ->orderByDesc('id')
                ->lockForUpdate()
                ->get();

            AccountDeletionRules::ensureNothingBlocks($user->id, $memberships);

            $request = AccountDeletionRequest::query()->create([
                'user_id' => $user->id,
                'status' => AccountDeletionStatus::Pending,
                'deletes_at' => now()->addDays(AccountDeletionRules::GRACE_DAYS),
            ]);

            $memberships->each(function (Membership $membership) use ($request): void {
                $request->deactivatedMemberships()->create([
                    'membership_id' => $membership->id,
                    'previous_status' => $membership->status,
                ]);

                /** @var array<int, MembershipRole> $roles */
                $roles = $membership->roles;

                $this->deactivate->handle(new MembershipUpdateData(
                    membershipId: $membership->id,
                    roles: $roles,
                    status: MembershipStatus::Inactive,
                ));
            });

            Mail::to($user->email)->queue(new AccountDeletionRequestedMail(
                name: $user->name,
                deletesOn: AccountDeletionRules::localDate($request->deletes_at, $memberships->first()),
            ));

            return $request;
        });
    }
}
