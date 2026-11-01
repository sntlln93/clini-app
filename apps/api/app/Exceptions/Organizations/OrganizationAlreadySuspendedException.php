<?php

declare(strict_types=1);

namespace App\Exceptions\Organizations;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

final class OrganizationAlreadySuspendedException extends DomainException
{
    public function __construct(
        private readonly int $organizationId,
    ) {
        parent::__construct('The organization is already suspended.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::OrganizationsAlreadySuspended;
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
