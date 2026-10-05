<?php

declare(strict_types=1);

namespace App\Exceptions\Auth;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * Thrown on clinic login (after the password matched) and by EnsureUserNotBlocked when the user was blocked by a platform operator.
 */
final class UserBlockedException extends DomainException
{
    public function __construct(
        private readonly int $userId,
    ) {
        parent::__construct('The user is blocked.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::AuthUserBlocked;
    }

    public function httpStatus(): int
    {
        return 403;
    }

    /**
     * @return array<string, mixed>
     */
    public function logContext(): array
    {
        return [
            'user_id' => $this->userId,
        ];
    }
}
