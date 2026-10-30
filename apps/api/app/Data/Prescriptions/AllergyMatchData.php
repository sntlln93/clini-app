<?php

declare(strict_types=1);

namespace App\Data\Prescriptions;

use App\Contracts\Data;
use App\Enums\AllergySeverity;

/**
 * A current allergy of the patient whose substance appears in the medication being indicated (#362), in the version
 * that matched. Its detail goes to the warning only when the professional may read it.
 */
final readonly class AllergyMatchData implements Data
{
    public function __construct(
        public int $entryId,
        public int $entryVersionId,
        public bool $detailShown,
        public string $description,
        public ?string $reaction,
        public ?AllergySeverity $severity,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'entryId' => $this->entryId,
            'entryVersionId' => $this->entryVersionId,
            'detailShown' => $this->detailShown,
            'description' => $this->description,
            'reaction' => $this->reaction,
            'severity' => $this->severity?->value,
        ];
    }
}
