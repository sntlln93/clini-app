<?php

declare(strict_types=1);

namespace App\Data\Medications;

use App\Contracts\Data;

/**
 * What the national vademecum's detail page adds to a listed product (#377): its active ingredients and how it is
 * given and dispensed.
 */
final readonly class MedicationDetailData implements Data
{
    /**
     * @param  list<MedicationIngredientData>  $ingredients
     */
    public function __construct(
        public string $gtin,
        public array $ingredients,
        public ?string $administrationRoute,
        public ?string $dispensingCondition,
        public ?string $troquel,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'gtin' => $this->gtin,
            'ingredients' => array_map(fn (MedicationIngredientData $ingredient) => $ingredient->toArray(), $this->ingredients),
            'administrationRoute' => $this->administrationRoute,
            'dispensingCondition' => $this->dispensingCondition,
            'troquel' => $this->troquel,
        ];
    }
}
