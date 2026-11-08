<?php

declare(strict_types=1);

namespace App\Exceptions\Memberships;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * The account the invitation would add the membership to is already a member of the organization (#417): through
 * the DNI it may be another email's account than the one invited.
 */
final class InvitationAlreadyMemberException extends DomainException
{
    public function __construct(private readonly int $invitationId, private readonly int $lookupsLeft)
    {
        parent::__construct('The account is already a member of the organization.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::MembershipsInvitationAlreadyMember;
    }

    public function httpStatus(): int
    {
        return 409;
    }

    /**
     * Never the DNI: only internal ids and counts.
     *
     * @return array<string, mixed>
     */
    public function logContext(): array
    {
        return ['invitation_id' => $this->invitationId, 'lookups_left' => $this->lookupsLeft];
    }

    /**
     * @return array<string, mixed>
     */
    public function publicContext(): array
    {
        return ['document_lookups_left' => $this->lookupsLeft];
    }
}
