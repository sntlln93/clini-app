<?php

declare(strict_types=1);

namespace App\Data\Prescriptions;

use App\Contracts\Data;

final readonly class PrescriptionAnnulmentData implements Data
{
    public function __construct(
        public int $prescriptionId,
        public int $membershipId,
        public string $reason,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'prescriptionId' => $this->prescriptionId,
            'membershipId' => $this->membershipId,
            'reason' => $this->reason,
        ];
    }
}
