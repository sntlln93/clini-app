<?php

declare(strict_types=1);

namespace App\Actions\Memberships;

use App\Actions\Auth\VerifyTwoFactorChallengeAction;
use App\Actions\Professionals\VerifyProfessionalLicensesAction;
use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Auth\TwoFactorChallengeData;
use App\Data\Memberships\InvitationAcceptanceData;
use App\Data\Professionals\ProfessionalLicenseVerificationData;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Exceptions\Auth\TwoFactorCodeInvalidException;
use App\Exceptions\Auth\TwoFactorNotEnabledException;
use App\Exceptions\Memberships\InvitationAccountOfAnotherPersonException;
use App\Exceptions\Memberships\InvitationAlreadyMemberException;
use App\Exceptions\Memberships\InvitationCredentialsInvalidException;
use App\Exceptions\Memberships\InvitationDocumentRequiredException;
use App\Exceptions\Memberships\InvitationInvalidOrExpiredException;
use App\Exceptions\Professionals\ProfessionalDocumentTakenException;
use App\Jobs\Subscriptions\SyncSubscriptionAmountJob;
use App\Models\Membership;
use App\Models\MembershipInvitation;
use App\Models\Organization;
use App\Models\User;
use App\Support\DocumentIndex;
use App\Support\OrganizationPlan;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Invitation validity is already enforced by AcceptInvitationRequest — this only re-checks the organization's suspension and plan (#237) under lock, creates the user/membership and marks the invitation accepted so its token can't be reused.
 *
 * A professional invitation (#417) is accepted with the identity its DNI found (`LookUpInvitationDocumentAction`): a
 * new account takes the registry's name and the DNI; an existing one (the DNI's, or the invited email's without a DNI)
 * proves it is the invitee's with its password and, if it has one, its second factor, and an account without a DNI
 * takes it and the registry's name. The licenses the registry holds for a DNI loaded here are brought once it commits.
 *
 * @implements Action<InvitationAcceptanceData>
 */
class AcceptInvitationAction implements Action
{
    public function __construct(
        private readonly OrganizationPlan $plans,
        private readonly VerifyTwoFactorChallengeAction $verifyTwoFactor,
        private readonly VerifyProfessionalLicensesAction $verifyLicenses,
    ) {}

    /**
     * @param  InvitationAcceptanceData  $dto
     */
    public function handle(Data $dto): Membership
    {
        $documentLoaded = false;

        try {
            $membership = DB::transaction(function () use ($dto, &$documentLoaded): Membership {
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

                if ($organization?->suspended_at !== null || $invitation->isExpired()) {
                    throw new InvitationInvalidOrExpiredException($invitation->token);
                }

                /** @var array<int, MembershipRole> $roles */
                $roles = $invitation->roles;

                $this->plans->ensureAllowsMember($invitation->organization_id, $roles);

                $user = $invitation->isForProfessional()
                    ? $this->professionalAccount($invitation, $dto, $documentLoaded)
                    : $this->account($invitation, $dto);

                if (Membership::withTrashed()
                    ->withoutGlobalScope('organization')
                    ->where('organization_id', $invitation->organization_id)
                    ->where('user_id', $user->id)
                    ->exists()) {
                    throw new InvitationAlreadyMemberException($invitation->id, $invitation->documentLookupsLeft());
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
        } catch (UniqueConstraintViolationException) {
            // Another account took the DNI between the check and the write.
            throw new ProfessionalDocumentTakenException(null);
        }

        if ($documentLoaded) {
            $this->verifyLicenses->handle(new ProfessionalLicenseVerificationData($membership->user_id));
        }

        return $membership;
    }

    /**
     * Any other invitation goes to the invited email's account, or a new one.
     */
    private function account(MembershipInvitation $invitation, InvitationAcceptanceData $dto): User
    {
        return User::where('email', $invitation->email)->first() ?? User::create([
            'name' => $dto->name,
            'email' => $invitation->email,
            'password' => Hash::make((string) $dto->password),
        ]);
    }

    private function professionalAccount(MembershipInvitation $invitation, InvitationAcceptanceData $dto, bool &$documentLoaded): User
    {
        $identity = $dto->identity;

        if ($identity === null || $identity->invitationId !== $invitation->id) {
            throw new InvitationDocumentRequiredException($invitation->id);
        }

        if ($identity->userId === null) {
            // Nobody had the DNI or the invited email when it was looked up: if someone does now, look it up again.
            if (User::query()->withDocument($identity->documentNumber)->exists() || User::query()->where('email', $invitation->email)->exists()) {
                throw new InvitationDocumentRequiredException($invitation->id);
            }

            $user = (new User)->forceFill([
                'name' => $identity->name,
                'email' => $invitation->email,
                'password' => Hash::make((string) $dto->password),
                'document_number' => $identity->documentNumber,
            ]);
            $user->save();
            $documentLoaded = true;

            return $user;
        }

        $user = User::query()->whereKey($identity->userId)->lockForUpdate()->first();

        if ($user === null) {
            throw new InvitationDocumentRequiredException($invitation->id);
        }

        $this->ensureCredentials($invitation, $user, $dto);

        $documentNumber = $user->document_number;

        if (is_string($documentNumber)) {
            if (DocumentIndex::normalize($documentNumber) !== DocumentIndex::normalize($identity->documentNumber)) {
                throw new InvitationAccountOfAnotherPersonException($invitation->id, $invitation->documentLookupsLeft());
            }

            return $user;
        }

        if (User::query()->withDocument($identity->documentNumber)->whereKeyNot($user->id)->exists()) {
            throw new ProfessionalDocumentTakenException($user->id);
        }

        $user->forceFill(['document_number' => $identity->documentNumber, 'name' => $identity->name, 'document_checked_at' => null])->save();
        $documentLoaded = true;

        return $user;
    }

    /**
     * The account's password and, if it has one, its second factor. A wrong one spends no DNI lookup: the acceptance's
     * throttle stops guessing.
     */
    private function ensureCredentials(MembershipInvitation $invitation, User $user, InvitationAcceptanceData $dto): void
    {
        if ($dto->password === null || ! Hash::check($dto->password, $user->password)) {
            throw new InvitationCredentialsInvalidException($invitation->id);
        }

        if (! $user->hasTwoFactorEnabled()) {
            return;
        }

        if ($dto->code === null && $dto->recoveryCode === null) {
            throw new InvitationCredentialsInvalidException($invitation->id);
        }

        try {
            $this->verifyTwoFactor->handle(new TwoFactorChallengeData($user, $dto->code, $dto->recoveryCode));
        } catch (TwoFactorCodeInvalidException|TwoFactorNotEnabledException) {
            throw new InvitationCredentialsInvalidException($invitation->id);
        }
    }
}
