<?php

declare(strict_types=1);

namespace App\Exceptions\Memberships;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * Thrown when an invitation token is malformed, unknown, already used, or
 * expired (`InvitationAcceptanceController`). The raw token is never
 * carried here — only its hash, which is what the lookup itself keys
 * on — since the raw token is a bearer credential and shouldn't be
 * duplicated into logs.
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
