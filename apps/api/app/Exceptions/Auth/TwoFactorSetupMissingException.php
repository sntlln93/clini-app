<?php

declare(strict_types=1);

namespace App\Exceptions\Auth;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

final class TwoFactorSetupMissingException extends DomainException
{
    public function __construct(
        private readonly int $userId,
    ) {
        parent::__construct('There is no two-factor setup waiting for confirmation.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::AuthTwoFactorSetupMissing;
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
