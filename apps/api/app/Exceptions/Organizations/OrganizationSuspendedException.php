<?php

declare(strict_types=1);

namespace App\Exceptions\Organizations;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * Thrown by ResolveCurrentOrganization when the authenticated user's resolved organization was suspended by a platform operator.
 */
final class OrganizationSuspendedException extends DomainException
{
    public function __construct(
        private readonly int $organizationId,
    ) {
        parent::__construct('The organization is suspended.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::OrganizationsSuspended;
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
            'organization_id' => $this->organizationId,
        ];
    }
}
