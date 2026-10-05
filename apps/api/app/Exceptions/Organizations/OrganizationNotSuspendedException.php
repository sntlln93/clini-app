<?php

declare(strict_types=1);

namespace App\Exceptions\Organizations;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * Thrown by ReactivateOrganizationAction when the organization is not suspended.
 */
final class OrganizationNotSuspendedException extends DomainException
{
    public function __construct(
        private readonly int $organizationId,
    ) {
        parent::__construct('The organization is not suspended.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::OrganizationsNotSuspended;
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
            'organization_id' => $this->organizationId,
        ];
    }
}
