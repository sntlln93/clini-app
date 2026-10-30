<?php

declare(strict_types=1);

namespace App\Data\Medications;

use App\Contracts\Data;

/**
 * What a professional typed in the medication field (#377).
 */
final readonly class MedicationSearchData implements Data
{
    public function __construct(
        public string $term,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return ['term' => $this->term];
    }
}
