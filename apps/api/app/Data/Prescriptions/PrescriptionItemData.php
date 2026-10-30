<?php

declare(strict_types=1);

namespace App\Data\Prescriptions;

use App\Contracts\Data;

final readonly class PrescriptionItemData implements Data
{
    /**
     * @param  string|null  $gtin  the catalog product it was picked from, if any (#377)
     * @param  list<string>|null  $substances  that product's active substances, copied from the catalog by the server
     *                                         (`MedicationSnapshot`), never taken from the request
     */
    public function __construct(
        public string $medication,
        public ?string $presentation,
        public string $dosage,
        public int $quantity,
        public ?string $gtin = null,
        public ?array $substances = null,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'medication' => $this->medication,
            'presentation' => $this->presentation,
            'dosage' => $this->dosage,
            'quantity' => $this->quantity,
            'gtin' => $this->gtin,
            'substances' => $this->substances,
        ];
    }
}
