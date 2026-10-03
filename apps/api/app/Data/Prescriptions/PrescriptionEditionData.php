<?php

declare(strict_types=1);

namespace App\Data\Prescriptions;

use App\Contracts\Data;

final readonly class PrescriptionEditionData implements Data
{
    /**
     * @param  list<PrescriptionItemData>  $items
     */
    public function __construct(
        public int $prescriptionId,
        public ?string $diagnosis,
        public array $items,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'prescriptionId' => $this->prescriptionId,
            'diagnosis' => $this->diagnosis,
            'items' => array_map(fn (PrescriptionItemData $item) => $item->toArray(), $this->items),
        ];
    }
}
