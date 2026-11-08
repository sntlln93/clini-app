<?php

declare(strict_types=1);

namespace App\Actions\Memberships;

use App\Actions\Professionals\IdentifyRegistryProfessionalAction;
use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Memberships\InvitationDocumentLookupData;
use App\Data\Memberships\InvitationIdentityData;
use App\Data\Memberships\InvitationTokenData;
use App\Data\Professionals\RegistryDocumentData;
use App\Data\Professionals\RegistryIdentityData;
use App\Exceptions\DomainException;
use App\Exceptions\Memberships\InvitationAccountOfAnotherPersonException;
use App\Exceptions\Memberships\InvitationAlreadyMemberException;
use App\Exceptions\Memberships\InvitationDocumentNotFoundException;
use App\Exceptions\Memberships\InvitationInvalidOrExpiredException;
use App\Exceptions\Memberships\InvitationLookupsExhaustedException;
use App\Models\Membership;
use App\Models\MembershipInvitation;
use App\Models\User;
use App\Support\DocumentIndex;
use Illuminate\Support\Facades\DB;

/**
 * The first step of accepting a professional invitation (#417): who the registry holds under the DNI typed, and which
 * account the membership goes to. One DNI, one account: the DNI's account if it has one, whatever email was invited;
 * else the invited email's account, unless it already holds another DNI; else a new one, named by the registry.
 *
 * Every DNI the registry answers about spends one of the invitation's lookups, found or not; an outage spends none.
 * A third that doesn't serve (nobody in the registry, the invited account is another person's, already a member)
 * expires the invitation. The count is decided under the invitation's lock, and the failure thrown only once it is
 * committed.
 *
 * @implements Action<InvitationDocumentLookupData>
 */
class LookUpInvitationDocumentAction implements Action
{
    public function __construct(
        private readonly FindValidInvitationAction $findValidInvitation,
        private readonly IdentifyRegistryProfessionalAction $identify,
    ) {}

    /**
     * @param  InvitationDocumentLookupData  $dto
     */
    public function handle(Data $dto): InvitationIdentityData
    {
        $invitation = $this->findValidInvitation->handle(new InvitationTokenData($dto->token));

        if (! $invitation->isForProfessional() || $invitation->documentLookupsLeft() === 0) {
            throw new InvitationInvalidOrExpiredException($invitation->token);
        }

        // Asked before a lookup is spent: an outage spends none.
        $identity = $this->identify->handle(new RegistryDocumentData($dto->documentNumber));

        $outcome = DB::transaction(function () use ($invitation, $identity, $dto): InvitationIdentityData|DomainException {
            $locked = MembershipInvitation::query()
                ->whereKey($invitation->id)
                ->whereNull('accepted_at')
                ->lockForUpdate()
                ->first();

            if ($locked === null || $locked->isExpired() || $locked->documentLookupsLeft() === 0) {
                return new InvitationInvalidOrExpiredException($invitation->token);
            }

            $locked->document_lookups++;
            $outcome = $this->outcome($locked, $identity, $dto->documentNumber);

            if ($outcome instanceof DomainException && $locked->documentLookupsLeft() === 0) {
                $locked->expires_at = now();
                $outcome = new InvitationLookupsExhaustedException($locked->id);
            }

            $locked->save();

            return $outcome;
        });

        if ($outcome instanceof DomainException) {
            throw $outcome;
        }

        return $outcome;
    }

    private function outcome(MembershipInvitation $invitation, ?RegistryIdentityData $identity, string $documentNumber): InvitationIdentityData|DomainException
    {
        $lookupsLeft = $invitation->documentLookupsLeft();

        if ($identity === null) {
            return new InvitationDocumentNotFoundException($invitation->id, $lookupsLeft);
        }

        $invited = User::query()->where('email', $invitation->email)->first();
        $invitedDocument = $invited?->document_number;

        if (is_string($invitedDocument) && DocumentIndex::normalize($invitedDocument) !== DocumentIndex::normalize($documentNumber)) {
            return new InvitationAccountOfAnotherPersonException($invitation->id, $lookupsLeft);
        }

        $account = User::query()->withDocument($documentNumber)->first() ?? $invited;

        if ($account !== null && Membership::withTrashed()
            ->withoutGlobalScope('organization')
            ->where('organization_id', $invitation->organization_id)
            ->where('user_id', $account->id)
            ->exists()) {
            return new InvitationAlreadyMemberException($invitation->id, $lookupsLeft);
        }

        return new InvitationIdentityData(
            invitationId: $invitation->id,
            documentNumber: $documentNumber,
            name: $identity->name,
            userId: $account?->id,
        );
    }
}
