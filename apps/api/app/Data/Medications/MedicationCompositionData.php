<?php

declare(strict_types=1);

namespace App\Data\Medications;

use App\Contracts\Data;

/**
 * What a product's drug text says it holds (#377): its substances in the source's order and whether the text cut the
 * list short («ergotamina+cafeína+asoc.» leaves the rest out), in which case nothing is guessed in its place.
 */
final readonly class MedicationCompositionData implements Data
{
    /**
     * @param  list<MedicationIngredientData>  $ingredients
     */
    public function __construct(
        public array $ingredients,
        public bool $incomplete,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'ingredients' => array_map(fn (MedicationIngredientData $ingredient): array => $ingredient->toArray(), $this->ingredients),
            'incomplete' => $this->incomplete,
        ];
    }
}
