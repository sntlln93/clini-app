<?php

declare(strict_types=1);

namespace App\Data\Professionals;

use App\Contracts\Data;
use App\Enums\ProfessionalLicenseMismatch;
use App\Enums\ProfessionalLicenseStatus;

/**
 * What the registry's answer means for one declared license (#380): verified or not, why not, and the registry's
 * license it was decided on (null when none matched).
 */
final readonly class ProfessionalLicenseOutcomeData implements Data
{
    public function __construct(
        public ProfessionalLicenseStatus $status,
        public ?ProfessionalLicenseMismatch $mismatchReason,
        public ?string $refepsCode,
        public ?RegistryLicenseData $license,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'status' => $this->status->value,
            'mismatchReason' => $this->mismatchReason?->value,
            'refepsCode' => $this->refepsCode,
            'license' => $this->license?->toArray(),
        ];
    }
}
