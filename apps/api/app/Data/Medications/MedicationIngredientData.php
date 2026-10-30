<?php

declare(strict_types=1);

namespace App\Data\Medications;

use App\Contracts\Data;

/**
 * One active pharmaceutical ingredient (IFA) of a product, as ANMAT lists it, and, when ANMAT says so, the form it
 * comes as (a salt, a hydrate). ANMAT doesn't separate them consistently: the salt often stays in the name.
 */
final readonly class MedicationIngredientData implements Data
{
    public function __construct(
        public string $name,
        public ?string $quantity,
        public ?string $unit,
        public ?string $asName,
        public ?string $asQuantity,
        public ?string $asUnit,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'quantity' => $this->quantity,
            'unit' => $this->unit,
            'asName' => $this->asName,
            'asQuantity' => $this->asQuantity,
            'asUnit' => $this->asUnit,
        ];
    }
}
