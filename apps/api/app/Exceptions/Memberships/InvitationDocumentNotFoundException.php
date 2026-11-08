<?php

declare(strict_types=1);

namespace App\Exceptions\Memberships;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * A professional invitation's DNI that the registry holds no one under (#417): without it nobody accepts as a
 * professional. It spent one of the invitation's lookups.
 */
final class InvitationDocumentNotFoundException extends DomainException
{
    public function __construct(private readonly int $invitationId, private readonly int $lookupsLeft)
    {
        parent::__construct('The professional registry holds no one under that document.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::MembershipsInvitationDocumentNotFound;
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
