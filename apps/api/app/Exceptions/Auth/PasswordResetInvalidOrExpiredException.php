<?php

declare(strict_types=1);

namespace App\Exceptions\Auth;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * A reset link whose token doesn't match the address typed, has expired or was already used (#389). It carries
 * nothing: neither the address, which is personal data, nor the token, a bearer credential.
 */
final class PasswordResetInvalidOrExpiredException extends DomainException
{
    public function __construct()
    {
        parent::__construct('The password reset link is invalid or has expired.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::AuthPasswordResetInvalidOrExpired;
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
        return [];
    }
}
