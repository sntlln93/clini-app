<?php

declare(strict_types=1);

namespace App\Exceptions\Auth;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * Thrown when an email-verification token is malformed, unknown, already
 * used, or expired (`EmailVerificationController`). The raw token is never
 * carried here — only its hash, which is what the lookup itself keys
 * on — since the raw token is a bearer credential and shouldn't be
 * duplicated into logs.
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
