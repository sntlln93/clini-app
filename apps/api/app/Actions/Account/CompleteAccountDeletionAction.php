<?php

declare(strict_types=1);

namespace App\Actions\Account;

use App\Actions\Memberships\DeactivateMembershipAction;
use App\Contracts\Action;
use App\Contracts\Data;
use App\Contracts\DomainError;
use App\Data\Account\AccountDeletionCompletionData;
use App\Data\Memberships\MembershipUpdateData;
use App\Enums\AccountDeletionStatus;
use App\Enums\AdminAuditSubject;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Exceptions\Account\AccountDeletionFutureAppointmentsException;
use App\Exceptions\Account\AccountDeletionLastActiveAdminException;
use App\Mail\Account\AccountDeletedMail;
use App\Mail\Account\AccountDeletionVoidedMail;
use App\Models\AccountDeletion;
use App\Models\AccountDeletionRequest;
use App\Models\Membership;
use App\Models\MembershipInvitation;
use App\Models\User;
use App\Support\AccountDeletionRules;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/**
 * Ends a pending account deletion whose grace period is over (#384, ADR 0034). The user row stays — memberships, and
 * through them every clinical record, point at it — but its personal data goes: the address becomes one no mail can
 * reach (also in the operators' audit trail), the credentials, second factor, DNI, licenses, specialties and public
 * links are dropped, and the name becomes «Usuario eliminado» unless the user wrote in a clinical history, which the
 * law keeps with who signed it. A membership that came back to life meanwhile is deactivated again under the same rules; if those refuse, nothing is
 * deleted: the request is voided, the memberships it deactivated come back and the user is told why.
 *
 * @implements Action<AccountDeletionCompletionData>
 */
class CompleteAccountDeletionAction implements Action
{
    public function __construct(
        private readonly DeactivateMembershipAction $deactivate,
    ) {}

    /**
     * @param  AccountDeletionCompletionData  $dto
     */
    public function handle(Data $dto): AccountDeletionStatus
    {
        return DB::transaction(function () use ($dto): AccountDeletionStatus {
            $request = AccountDeletionRequest::query()
                ->pending()
                ->whereKey($dto->requestId)
                ->where('deletes_at', '<=', now())
                ->lockForUpdate()
                ->first();

            if ($request === null) {
                return AccountDeletionStatus::Pending;
            }

            $user = User::query()->lockForUpdate()->findOrFail($request->user_id);

            $memberships = Membership::withoutGlobalScope('organization')
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->get();

            try {
                AccountDeletionRules::ensureNothingBlocks($user->id, $memberships);
            } catch (AccountDeletionLastActiveAdminException|AccountDeletionFutureAppointmentsException $blocked) {
                return $this->void($request, $user, $blocked);
            }

            $memberships->each(function (Membership $membership): void {
                /** @var array<int, MembershipRole> $roles */
                $roles = $membership->roles;

                $this->deactivate->handle(new MembershipUpdateData(
                    membershipId: $membership->id,
                    roles: $roles,
                    status: MembershipStatus::Inactive,
                ));
            });

            // Queued with the address before it goes; sent once this commits.
            Mail::to($user->email)->queue(new AccountDeletedMail(name: $user->name));

            $this->anonymize($user);

            AccountDeletion::query()->create(['user_id' => $user->id]);

            $request->update([
                'status' => AccountDeletionStatus::Completed,
                'resolved_at' => now(),
            ]);

            return AccountDeletionStatus::Completed;
        }, attempts: 3);
    }

    private function void(AccountDeletionRequest $request, User $user, DomainError $blocked): AccountDeletionStatus
    {
        AccountDeletionRules::restoreMemberships($request);

        $request->update([
            'status' => AccountDeletionStatus::Voided,
            'resolved_at' => now(),
        ]);

        /** @var array<int, array{id: int, name: string}> $organizations */
        $organizations = $blocked->publicContext()['organizations'] ?? [];

        Mail::to($user->email)->queue(new AccountDeletionVoidedMail(
            name: $user->name,
            reason: $blocked->errorCode(),
            organizationNames: array_column($organizations, 'name'),
        ));

        return AccountDeletionStatus::Voided;
    }

    private function anonymize(User $user): void
    {
        $email = $user->email;

        Membership::withoutGlobalScope('organization')
            ->withTrashed()
            ->where('user_id', $user->id)
            ->update(['slug' => null]);

        $user->professionalLicenses()->delete();
        // Also drops the user's specialties in every organization (`professional_specialties` cascades).
        $user->specialties()->detach();

        MembershipInvitation::withoutGlobalScope('organization')
            ->where('email', $email)
            ->whereNull('accepted_at')
            ->delete();

        MembershipInvitation::withoutGlobalScope('organization')
            ->where('email', $email)
            ->update(['email' => AccountDeletionRules::anonymousEmail($user->id)]);

        DB::table('password_reset_tokens')->where('email', $email)->delete();

        // The operators' audit trail keeps what they did and why, but names the user by the anonymous address too.
        DB::update(
            "UPDATE admin_audit_logs SET metadata = jsonb_set(metadata, '{subject_label}', to_jsonb(?::text), false) WHERE subject_type = ? AND subject_id = ?",
            [AccountDeletionRules::anonymousEmail($user->id), AdminAuditSubject::User->value, $user->id],
        );

        $user->forceFill([
            'name' => AccountDeletionRules::isClinicalAuthor($user->id) ? $user->name : AccountDeletionRules::ANONYMOUS_NAME,
            'email' => AccountDeletionRules::anonymousEmail($user->id),
            'email_verified_at' => null,
            'email_verification_token' => null,
            'email_verification_token_expires_at' => null,
            'password' => Hash::make(Str::random(64)),
            'remember_token' => null,
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
            'two_factor_last_used_step' => null,
            'document_number' => null,
            'block_reason' => null,
        ])->save();
    }
}
