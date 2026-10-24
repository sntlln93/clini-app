<?php

declare(strict_types=1);

namespace App\Data\ClinicalAccess;

use App\Contracts\Data;
use App\Enums\ClinicalAccessReason;

/**
 * A professional's reason to open a patient's history without an appointment near today.
 */
final readonly class ExceptionalAccessDeclarationData implements Data
{
    public function __construct(
        public int $organizationId,
        public int $membershipId,
        public int $patientId,
        public ClinicalAccessReason $reason,
        public ?string $reasonDetail,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'organizationId' => $this->organizationId,
            'membershipId' => $this->membershipId,
            'patientId' => $this->patientId,
            'reason' => $this->reason->value,
            'reasonDetail' => $this->reasonDetail,
        ];
    }
}
