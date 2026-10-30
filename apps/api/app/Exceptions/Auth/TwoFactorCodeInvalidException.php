<?php

declare(strict_types=1);

namespace App\Exceptions\Auth;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * A wrong, already used or out-of-window code. A rejected credential, like a
 * wrong password, but it answers 409 with its own code so the panel can show
 * it on the field (ADR 0009 keeps 422 for the FormRequest's own rules).
 */
final class TwoFactorCodeInvalidException extends DomainException
{
    public function __construct(
        private readonly int $userId,
    ) {
        parent::__construct('The two-factor code is invalid.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::AuthTwoFactorCodeInvalid;
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
