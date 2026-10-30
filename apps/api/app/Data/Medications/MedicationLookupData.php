<?php

declare(strict_types=1);

namespace App\Data\Medications;

use App\Contracts\Data;

/**
 * The catalog product a professional picked, whose active ingredients the form needs (#377).
 */
final readonly class MedicationLookupData implements Data
{
    public function __construct(
        public int $productId,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return ['productId' => $this->productId];
    }
}
