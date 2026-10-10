<?php

declare(strict_types=1);

namespace App\Exceptions\Plans;

use App\Enums\ErrorCode;
use App\Enums\Plan;
use App\Enums\PlanFeature;
use App\Exceptions\DomainException;

/**
 * The organization's plan doesn't include the function the request uses
 * (#237): the panel offers to change plan.
 */
final class PlanFeatureUnavailableException extends DomainException
{
    public function __construct(
        private readonly int $organizationId,
        private readonly Plan $plan,
        private readonly PlanFeature $feature,
    ) {
        parent::__construct('The organization plan does not include this feature.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::PlansFeatureUnavailable;
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
            'plan' => $this->plan->value,
            'feature' => $this->feature->value,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function publicContext(): array
    {
        return [
            'plan' => $this->plan->value,
            'feature' => $this->feature->value,
        ];
    }
}
