<?php

declare(strict_types=1);

namespace App\Data\Medications;

use App\Contracts\Data;

/**
 * One product as a medication source lists it (#377), already normalized: a 14-digit GTIN, plain spaces, and null
 * where the source left a value blank.
 */
final readonly class MedicationProductData implements Data
{
    /**
     * @param  string|null  $updatedOn  the date the source last updated it, as Y-m-d
     */
    public function __construct(
        public string $gtin,
        public string $name,
        public ?string $presentation,
        public ?string $pharmaceuticalForm,
        public ?string $administrationRoute,
        public ?string $laboratory,
        public ?string $troquel,
        public ?string $snomed,
        public ?string $drug,
        public ?string $drugCode,
        public ?string $therapeuticAction,
        public ?string $therapeuticActionCode,
        public ?string $dispensingCondition,
        public ?string $controlMark,
        public bool $withdrawn,
        public bool $inForce,
        public ?string $updatedOn,
        public MedicationCompositionData $composition,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'gtin' => $this->gtin,
            'name' => $this->name,
            'presentation' => $this->presentation,
            'pharmaceuticalForm' => $this->pharmaceuticalForm,
            'administrationRoute' => $this->administrationRoute,
            'laboratory' => $this->laboratory,
            'troquel' => $this->troquel,
            'snomed' => $this->snomed,
            'drug' => $this->drug,
            'drugCode' => $this->drugCode,
            'therapeuticAction' => $this->therapeuticAction,
            'therapeuticActionCode' => $this->therapeuticActionCode,
            'dispensingCondition' => $this->dispensingCondition,
            'controlMark' => $this->controlMark,
            'withdrawn' => $this->withdrawn,
            'inForce' => $this->inForce,
            'updatedOn' => $this->updatedOn,
            'composition' => $this->composition->toArray(),
        ];
    }
}
