<?php

declare(strict_types=1);

namespace App\Data\VitalSigns;

use App\Contracts\Data;

final readonly class VitalSignDraftData implements Data
{
    public function __construct(
        public int $organizationId,
        public int $appointmentId,
        public int $patientId,
        public int $membershipId,
        public VitalSignValuesData $values,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'organizationId' => $this->organizationId,
            'appointmentId' => $this->appointmentId,
            'patientId' => $this->patientId,
            'membershipId' => $this->membershipId,
            'values' => $this->values->toArray(),
        ];
    }
}
