<?php

declare(strict_types=1);

namespace App\Exceptions\Memberships;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * The invited email's account already holds another DNI (#417): it is another person's, so the invitation can't be
 * accepted with this one. It spent one of the invitation's lookups.
 */
final class InvitationAccountOfAnotherPersonException extends DomainException
{
    public function __construct(private readonly int $invitationId, private readonly int $lookupsLeft)
    {
        parent::__construct('The invited account belongs to another person.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::MembershipsInvitationAccountOfAnotherPerson;
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
