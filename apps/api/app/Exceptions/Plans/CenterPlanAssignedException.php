<?php

declare(strict_types=1);

namespace App\Exceptions\Plans;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * The organization is on Center, which is billed outside the platform: the
 * owner can't start a Mercado Pago subscription on top of it.
 */
final class CenterPlanAssignedException extends DomainException
{
    public function __construct(
        private readonly int $organizationId,
    ) {
        parent::__construct('The organization is on the Center plan.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::PlansCenterAssigned;
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
        return ['organization_id' => $this->organizationId];
    }
}
