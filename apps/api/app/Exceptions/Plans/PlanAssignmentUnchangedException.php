<?php

declare(strict_types=1);

namespace App\Exceptions\Plans;

use App\Enums\ErrorCode;
use App\Enums\Plan;
use App\Exceptions\DomainException;

/**
 * An operator assigned the plan the organization already has assigned
 * (or removed an assignment it doesn't have): nothing to audit.
 */
final class PlanAssignmentUnchangedException extends DomainException
{
    public function __construct(
        private readonly int $organizationId,
        private readonly ?Plan $assignedPlan,
    ) {
        parent::__construct('The organization already has this plan assignment.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::PlansAssignmentUnchanged;
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
            'assigned_plan' => $this->assignedPlan?->value,
        ];
    }
}
