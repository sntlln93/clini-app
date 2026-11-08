<?php

declare(strict_types=1);

namespace App\Exceptions\Memberships;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * A professional invitation is accepted only after its DNI was looked up in this session (#417).
 */
final class InvitationDocumentRequiredException extends DomainException
{
    public function __construct(private readonly int $invitationId)
    {
        parent::__construct('The invitation\'s document has not been looked up.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::MembershipsInvitationDocumentRequired;
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
