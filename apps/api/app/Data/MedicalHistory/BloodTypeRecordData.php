<?php

declare(strict_types=1);

namespace App\Data\MedicalHistory;

use App\Contracts\Data;
use App\Enums\BloodType;

final readonly class BloodTypeRecordData implements Data
{
    public function __construct(
        public int $organizationId,
        public int $appointmentId,
        public int $patientId,
        public int $membershipId,
        public BloodType $bloodType,
        public ?string $reason,
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
            'bloodType' => $this->bloodType->value,
            'reason' => $this->reason,
        ];
    }
}
