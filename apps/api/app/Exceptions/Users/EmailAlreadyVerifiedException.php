<?php

declare(strict_types=1);

namespace App\Exceptions\Users;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * Thrown by VerifyUserEmailManuallyAction when the user's email is already verified.
 */
final class EmailAlreadyVerifiedException extends DomainException
{
    public function __construct(
        private readonly int $userId,
    ) {
        parent::__construct('The user email is already verified.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::UsersEmailAlreadyVerified;
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
