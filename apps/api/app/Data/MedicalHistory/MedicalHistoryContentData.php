<?php

declare(strict_types=1);

namespace App\Data\MedicalHistory;

use App\Contracts\Data;
use App\Enums\AllergySeverity;
use App\Enums\MedicalHistoryCategory;

/**
 * The text of one background entry. An allergy's description is its substance, and only an allergy carries a
 * reaction and a severity; only an antecedent carries an approximate date.
 */
final readonly class MedicalHistoryContentData implements Data
{
    public function __construct(
        public string $description,
        public ?string $reaction = null,
        public ?AllergySeverity $severity = null,
        public ?string $approximateDate = null,
    ) {}

    /**
     * The same content without what the category doesn't carry.
     */
    public function forCategory(MedicalHistoryCategory $category): self
    {
        $allergy = $category === MedicalHistoryCategory::Allergy;

        return new self(
            description: $this->description,
            reaction: $allergy ? $this->reaction : null,
            severity: $allergy ? $this->severity : null,
            approximateDate: $allergy ? null : $this->approximateDate,
        );
    }

    /**
     * @return array<string, string|null>
     */
    public function toArray(): array
    {
        return [
            'description' => $this->description,
            'reaction' => $this->reaction,
            'severity' => $this->severity?->value,
            'approximate_date' => $this->approximateDate,
        ];
    }
}
