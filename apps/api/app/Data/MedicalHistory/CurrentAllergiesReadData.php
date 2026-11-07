<?php

declare(strict_types=1);

namespace App\Data\MedicalHistory;

use App\Contracts\Data;

/**
 * Whose current allergies are read, and by whom, above the form that indicates medication (#362, #382).
 */
final readonly class CurrentAllergiesReadData implements Data
{
    public function __construct(
        public int $organizationId,
        public int $membershipId,
        public int $patientId,
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
        ];
    }
}
