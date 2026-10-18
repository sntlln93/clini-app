<?php

declare(strict_types=1);

namespace App\Data\Prescriptions;

use App\Contracts\Data;

final readonly class PrescriptionAmendmentData implements Data
{
    /**
     * @param  list<PrescriptionItemData>  $items
     */
    public function __construct(
        public int $prescriptionId,
        public int $membershipId,
        public array $items,
        public ?string $reason,
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
        ];
    }
}
