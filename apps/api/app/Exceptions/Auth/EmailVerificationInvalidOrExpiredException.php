<?php

declare(strict_types=1);

namespace App\Exceptions\Auth;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * Carries only the token hash, never the raw bearer credential, so it never
 * ends up duplicated into logs.
 */
final class EmailVerificationInvalidOrExpiredException extends DomainException
{
    public function __construct(
        private readonly string $tokenHash,
    ) {
        parent::__construct('The email verification link is invalid or has expired.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::AuthEmailVerificationInvalidOrExpired;
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
