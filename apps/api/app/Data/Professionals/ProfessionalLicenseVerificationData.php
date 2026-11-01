<?php

declare(strict_types=1);

namespace App\Data\Professionals;

use App\Contracts\Data;

/**
 * Whose licenses to check against the registry (#380). `strict` is the professional asking for it: then a registry that
 * is off or failing answers `professionals.registry_unavailable` instead of leaving the licenses quietly as they were.
 */
final readonly class ProfessionalLicenseVerificationData implements Data
{
    public function __construct(
        public int $userId,
        public bool $strict = false,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return ['userId' => $this->userId, 'strict' => $this->strict];
    }
}
