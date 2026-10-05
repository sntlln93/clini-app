<?php

declare(strict_types=1);

namespace App\Exceptions\Users;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * Thrown by UnblockUserAction when the user is not blocked.
 */
final class UserNotBlockedException extends DomainException
{
    public function __construct(
        private readonly int $userId,
    ) {
        parent::__construct('The user is not blocked.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::UsersNotBlocked;
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
        return [
            'user_id' => $this->userId,
        ];
    }
}
