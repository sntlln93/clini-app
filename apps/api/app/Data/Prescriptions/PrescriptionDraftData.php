<?php

declare(strict_types=1);

namespace App\Data\Prescriptions;

use App\Contracts\Data;

final readonly class PrescriptionDraftData implements Data
{
    /**
     * @param  list<PrescriptionItemData>  $items
     * @param  list<AllergyMatchData>  $allergyMatches  confirmed with «Indicar igual» (#362)
     */
    public function __construct(
        public int $organizationId,
        public int $appointmentId,
        public int $patientId,
        public int $membershipId,
        public array $items,
        public array $allergyMatches,
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
            'allergyMatches' => array_map(fn (AllergyMatchData $match) => $match->toArray(), $this->allergyMatches),
        ];
    }
}
