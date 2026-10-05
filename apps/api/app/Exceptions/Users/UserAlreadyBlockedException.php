<?php

declare(strict_types=1);

namespace App\Exceptions\Users;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * Thrown by BlockUserAction when the user is already blocked.
 */
final class UserAlreadyBlockedException extends DomainException
{
    public function __construct(
        private readonly int $userId,
    ) {
        parent::__construct('The user is already blocked.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::UsersAlreadyBlocked;
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
