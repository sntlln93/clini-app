<?php

declare(strict_types=1);

namespace App\Data\Organizations;

use App\Contracts\Data;

/**
 * What a practice still lacks to take appointments (#286): someone who
 * attends, a service they offer and their weekly hours. Each step counts
 * once any active professional has it.
 */
final readonly class OrganizationSetupProgressData implements Data
{
    public function __construct(
        public bool $hasProfessional,
        public bool $hasService,
        public bool $hasAvailability,
    ) {}

    public function isReady(): bool
    {
        return $this->hasProfessional && $this->hasService && $this->hasAvailability;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'has_professional' => $this->hasProfessional,
            'has_service' => $this->hasService,
            'has_availability' => $this->hasAvailability,
        ];
    }
}
