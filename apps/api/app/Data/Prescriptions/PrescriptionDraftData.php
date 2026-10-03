<?php

declare(strict_types=1);

namespace App\Data\Prescriptions;

use App\Contracts\Data;

final readonly class PrescriptionDraftData implements Data
{
    /**
     * @param  list<PrescriptionItemData>  $items
     */
    public function __construct(
        public int $organizationId,
        public int $appointmentId,
        public int $patientId,
        public int $membershipId,
        public ?string $diagnosis,
        public array $items,
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
            'diagnosis' => $this->diagnosis,
            'items' => array_map(fn (PrescriptionItemData $item) => $item->toArray(), $this->items),
        ];
    }
}
