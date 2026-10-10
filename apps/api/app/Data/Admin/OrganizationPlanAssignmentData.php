<?php

declare(strict_types=1);

namespace App\Data\Admin;

use App\Contracts\Data;
use App\Enums\Plan;

/**
 * An operator's assignment of a plan outside self-service billing (only
 * Center today); a null plan returns the organization to self-service.
 */
final readonly class OrganizationPlanAssignmentData implements Data
{
    public function __construct(
        public AdminActorData $actor,
        public int $organizationId,
        public ?Plan $assignedPlan,
        public string $reason,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'actor' => $this->actor,
            'organizationId' => $this->organizationId,
            'assignedPlan' => $this->assignedPlan?->value,
            'reason' => $this->reason,
        ];
    }
}
