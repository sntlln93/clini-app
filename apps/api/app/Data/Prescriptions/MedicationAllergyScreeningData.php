<?php

declare(strict_types=1);

namespace App\Data\Prescriptions;

use App\Contracts\Data;

/**
 * The medication about to be indicated for a patient, checked against their current allergies (#362), with the
 * allergies the professional already confirmed with «Indicar igual».
 */
final readonly class MedicationAllergyScreeningData implements Data
{
    /**
     * @param  list<PrescriptionItemData>  $items
     * @param  list<int>  $confirmedAllergyIds
     */
    public function __construct(
        public int $organizationId,
        public int $membershipId,
        public int $patientId,
        public array $items,
        public array $confirmedAllergyIds,
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
            'items' => array_map(fn (PrescriptionItemData $item) => $item->toArray(), $this->items),
            'confirmedAllergyIds' => $this->confirmedAllergyIds,
        ];
    }
}
