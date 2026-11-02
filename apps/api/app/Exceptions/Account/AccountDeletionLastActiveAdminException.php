<?php

declare(strict_types=1);

namespace App\Exceptions\Account;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * The user is the only active owner or admin of the listed organizations (#384): someone else has to manage them
 * before the account can go. Same invariant as LastActiveAdminException, with its own code so the panel says what to
 * resolve.
 */
final class AccountDeletionLastActiveAdminException extends DomainException
{
    /**
     * @param  array<int, array{id: int, name: string}>  $organizations
     */
    public function __construct(
        private readonly int $userId,
        private readonly array $organizations,
    ) {
        parent::__construct('The user is the last active owner or admin of an organization.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::AccountDeletionLastActiveAdmin;
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
            'organization_ids' => array_column($this->organizations, 'id'),
        ];
    }

    /**
     * The user's own organizations, so the panel names what to resolve.
     *
     * @return array<string, mixed>
     */
    public function publicContext(): array
    {
        return [
            'organizations' => $this->organizations,
        ];
    }
}
