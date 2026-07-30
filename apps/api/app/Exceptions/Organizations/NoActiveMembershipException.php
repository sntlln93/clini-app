<?php

declare(strict_types=1);

namespace App\Exceptions\Organizations;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * Thrown when an authenticated user has no active membership in any
 * organization (`ResolveCurrentOrganization`).
 */
final class NoActiveMembershipException extends DomainException
{
    public function __construct(
        private readonly int $userId,
    ) {
        parent::__construct('The user has no active membership in any organization.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::OrganizationsNoActiveMembership;
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
