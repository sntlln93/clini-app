<?php

declare(strict_types=1);

namespace App\Data\Medications;

use App\Contracts\Data;

/**
 * One active substance of a catalog product (#377): its name as the source writes it («pseudoef.», «clavulánico,ác.»)
 * and the substance it names, in lowercase, without abbreviations or salts and with its accents («ácido
 * clavulánico»): what the panel shows and the allergy warning compares, folded.
 */
final readonly class MedicationIngredientData implements Data
{
    public function __construct(
        public string $name,
        public string $substance,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'substance' => $this->substance,
        ];
    }
}
