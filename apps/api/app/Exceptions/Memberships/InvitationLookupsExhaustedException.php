<?php

declare(strict_types=1);

namespace App\Exceptions\Memberships;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * The third DNI of a professional invitation didn't serve either (#417): the invitation expired, and the practice has
 * to invite again.
 */
final class InvitationLookupsExhaustedException extends DomainException
{
    public function __construct(private readonly int $invitationId)
    {
        parent::__construct('The invitation ran out of document lookups.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::MembershipsInvitationLookupsExhausted;
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
