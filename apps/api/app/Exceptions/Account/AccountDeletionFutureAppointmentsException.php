<?php

declare(strict_types=1);

namespace App\Exceptions\Account;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * The user has appointments still to come as a professional in the listed organizations (#384): they are reassigned
 * or cancelled first, as before stopping to attend (#286). Nothing cancels them on its own.
 */
final class AccountDeletionFutureAppointmentsException extends DomainException
{
    /**
     * @param  array<int, array{id: int, name: string}>  $organizations
     */
    public function __construct(
        private readonly int $userId,
        private readonly array $organizations,
    ) {
        parent::__construct('The user has upcoming appointments as a professional.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::AccountDeletionFutureAppointments;
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
