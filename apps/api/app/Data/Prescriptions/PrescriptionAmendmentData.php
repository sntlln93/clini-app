<?php

declare(strict_types=1);

namespace App\Data\Prescriptions;

use App\Contracts\Data;

final readonly class PrescriptionAmendmentData implements Data
{
    /**
     * @param  list<PrescriptionItemData>  $items
     * @param  list<AllergyConfirmationData>  $confirmedAllergies  sent back with «Indicar igual» (#362)
     */
    public function __construct(
        public int $prescriptionId,
        public int $membershipId,
        public array $items,
        public ?string $reason,
        public array $confirmedAllergies,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'prescriptionId' => $this->prescriptionId,
            'membershipId' => $this->membershipId,
            'items' => array_map(fn (PrescriptionItemData $item) => $item->toArray(), $this->items),
            'reason' => $this->reason,
            'confirmedAllergies' => array_map(fn (AllergyConfirmationData $confirmation) => $confirmation->toArray(), $this->confirmedAllergies),
        ];
    }
}
