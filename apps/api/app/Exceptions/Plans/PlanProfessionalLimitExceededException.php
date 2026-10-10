<?php

declare(strict_types=1);

namespace App\Exceptions\Plans;

use App\Enums\ErrorCode;
use App\Enums\Plan;
use App\Exceptions\DomainException;

/**
 * Thrown by EnsureSubscriptionActive when an organization has more active
 * professionals than its plan allows (a Practice one whose subscription
 * ended, now on Free): its writes stay read-only until it changes plan or
 * deactivates professionals. Nobody is deactivated for it.
 */
final class PlanProfessionalLimitExceededException extends DomainException
{
    public function __construct(
        private readonly int $organizationId,
        private readonly Plan $plan,
        private readonly int $professionalLimit,
        private readonly int $activeProfessionals,
    ) {
        parent::__construct('The organization has more active professionals than its plan allows.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::PlansProfessionalLimitExceeded;
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
        return ['organization_id' => $this->organizationId, ...$this->publicContext()];
    }

    /**
     * @return array<string, mixed>
     */
    public function publicContext(): array
    {
        return [
            'plan' => $this->plan->value,
            'professional_limit' => $this->professionalLimit,
            'active_professionals' => $this->activeProfessionals,
        ];
    }
}
