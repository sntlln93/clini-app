<?php

declare(strict_types=1);

namespace App\Exceptions\Plans;

use App\Enums\ErrorCode;
use App\Enums\Plan;
use App\Exceptions\DomainException;

/**
 * Thrown by BookAppointmentAction when the appointment's month, in the
 * organization's timezone, already holds as many appointments as the plan
 * allows (#238). The online booking page maps it to a message that never
 * names the plan.
 */
final class PlanAppointmentLimitReachedException extends DomainException
{
    public function __construct(
        private readonly int $organizationId,
        private readonly Plan $plan,
        private readonly int $appointmentLimit,
        private readonly string $month,
    ) {
        parent::__construct('The organization reached its plan\'s monthly appointment limit.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::PlansAppointmentLimitReached;
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
        return ['organization_id' => $this->organizationId, 'plan' => $this->plan->value, ...$this->publicContext()];
    }

    /**
     * Leaves the plan out: the public booking route returns it too.
     *
     * @return array<string, mixed>
     */
    public function publicContext(): array
    {
        return [
            'appointment_limit' => $this->appointmentLimit,
            'month' => $this->month,
        ];
    }
}
