<?php

declare(strict_types=1);

namespace App\Exceptions\Memberships;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * Only the token hash is kept here (never the raw bearer token) so it never leaks into logs — InvitationAcceptanceController.
 */
final class InvitationInvalidOrExpiredException extends DomainException
{
    public function __construct(
        private readonly string $tokenHash,
    ) {
        parent::__construct('The invitation is invalid or has expired.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::MembershipsInvitationInvalidOrExpired;
    }

    public function httpStatus(): int
    {
        return 404;
    }

    /**
     * @return array<string, mixed>
     */
    public function logContext(): array
    {
        return [
            'token_hash' => $this->tokenHash,
        ];
    }
}
