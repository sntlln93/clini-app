<?php

declare(strict_types=1);

namespace App\Data\Subscriptions;

use App\Contracts\Data;
use App\Enums\Plan;

/**
 * An organization's plan as `GET /plan` reports it.
 */
final readonly class PlanOverviewData implements Data
{
    public function __construct(
        public Plan $plan,
        public bool $assignedByPlatform,
        public int $activeProfessionals,
        public int $appointmentsThisMonth,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'plan' => $this->plan->value,
            'assigned_by_platform' => $this->assignedByPlatform,
            'active_professionals' => $this->activeProfessionals,
            'appointments_this_month' => $this->appointmentsThisMonth,
        ];
    }
}
