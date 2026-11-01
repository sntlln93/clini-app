<?php

declare(strict_types=1);

namespace App\Data\Prescriptions;

use App\Contracts\Data;

final readonly class PrescriptionItemData implements Data
{
    /**
     * Everything after `quantity` is what an item picked from the medication catalog keeps of its product (#377),
     * copied from the catalog by the server (`MedicationSnapshot`), never taken from the request beyond the GTIN.
     *
     * @param  string|null  $gtin  the catalog product it was picked from, if any
     * @param  list<string>|null  $substances  that product's substances, written out («ácido clavulánico»)
     * @param  string|null  $dispensingCondition  «Venta Bajo Receta Archivada» and the like
     * @param  string|null  $controlMark  «PSICOTROPICO IV» and the like; null when not controlled
     * @param  bool|null  $compositionIncomplete  whether the source cut its drug text short («+asoc.»), so the substances
     *                                            miss some; null for a free-text item
     */
    public function __construct(
        public string $medication,
        public ?string $presentation,
        public string $dosage,
        public int $quantity,
        public ?string $gtin = null,
        public ?string $snomed = null,
        public ?array $substances = null,
        public ?string $dispensingCondition = null,
        public ?string $controlMark = null,
        public ?bool $compositionIncomplete = null,
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
            'snomed' => $this->snomed,
            'substances' => $this->substances,
            'dispensing_condition' => $this->dispensingCondition,
            'control_mark' => $this->controlMark,
            'composition_incomplete' => $this->compositionIncomplete,
        ];
    }
}
