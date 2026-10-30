<?php

declare(strict_types=1);

namespace App\Data\Prescriptions;

use App\Contracts\Data;

final readonly class PrescriptionDraftData implements Data
{
    /**
     * @param  list<PrescriptionItemData>  $items
     * @param  list<AllergyConfirmationData>  $confirmedAllergies  sent back with «Indicar igual» (#362)
     */
    public function __construct(
        public int $organizationId,
        public int $appointmentId,
        public int $patientId,
        public int $membershipId,
        public array $items,
        public array $confirmedAllergies,
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
            'items' => array_map(fn (PrescriptionItemData $item) => $item->toArray(), $this->items),
            'confirmedAllergies' => array_map(fn (AllergyConfirmationData $confirmation) => $confirmation->toArray(), $this->confirmedAllergies),
        ];
    }
}
