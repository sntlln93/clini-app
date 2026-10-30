<?php

declare(strict_types=1);

namespace App\Exceptions\Auth;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * The session holds no password-verified login waiting for its code: it
 * never started, expired, or was already completed.
 */
final class TwoFactorChallengeExpiredException extends DomainException
{
    public function __construct()
    {
        parent::__construct('There is no pending two-factor login, or it expired.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::AuthTwoFactorChallengeExpired;
    }

    public function httpStatus(): int
    {
        return 409;
    }

    /**
     * @return array<string, mixed>
     */
    public function logContext(): array
    {
        return [];
    }
}
