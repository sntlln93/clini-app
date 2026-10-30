<?php

declare(strict_types=1);

namespace App\Data\Medications;

use App\Contracts\Data;

/**
 * One row of the national vademecum's listing (#377): one product, as ANMAT's public lookup shows it. Its generic
 * name is display text; the structured ingredients only come with the detail.
 */
final readonly class MedicationListingData implements Data
{
    public function __construct(
        public string $gtin,
        public string $certificateNumber,
        public string $laboratory,
        public string $commercialName,
        public string $pharmaceuticalForm,
        public string $presentation,
        public string $genericName,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'gtin' => $this->gtin,
            'certificateNumber' => $this->certificateNumber,
            'laboratory' => $this->laboratory,
            'commercialName' => $this->commercialName,
            'pharmaceuticalForm' => $this->pharmaceuticalForm,
            'presentation' => $this->presentation,
            'genericName' => $this->genericName,
        ];
    }
}
