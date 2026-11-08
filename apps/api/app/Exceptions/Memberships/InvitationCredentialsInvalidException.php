<?php

declare(strict_types=1);

namespace App\Exceptions\Memberships;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * The password (or the second factor) of the account a professional invitation links to is wrong (#417). It spends
 * none of the invitation's lookups: the acceptance's throttle stops guessing.
 */
final class InvitationCredentialsInvalidException extends DomainException
{
    public function __construct(private readonly int $invitationId)
    {
        parent::__construct('The account credentials are invalid.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::MembershipsInvitationCredentialsInvalid;
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
        return ['invitation_id' => $this->invitationId];
    }
}
