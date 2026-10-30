<?php

declare(strict_types=1);

namespace App\Data\ClinicalAccess;

use App\Contracts\Data;

/**
 * A code the patient shared, as the professional typed it, to read the patient's history (#364, ADR 0029).
 */
final readonly class AccessCodeRedemptionData implements Data
{
    public function __construct(
        public int $organizationId,
        public int $membershipId,
        public int $patientId,
        public string $code,
    ) {}

    /**
     * The code stays out: it is a credential.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'organizationId' => $this->organizationId,
            'membershipId' => $this->membershipId,
            'patientId' => $this->patientId,
        ];
    }
}
