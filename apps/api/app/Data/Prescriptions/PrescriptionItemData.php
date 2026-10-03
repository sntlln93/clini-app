<?php

declare(strict_types=1);

namespace App\Data\Prescriptions;

use App\Contracts\Data;

final readonly class PrescriptionItemData implements Data
{
    public function __construct(
        public string $medication,
        public ?string $presentation,
        public string $dosage,
        public int $quantity,
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
        ];
    }
}
