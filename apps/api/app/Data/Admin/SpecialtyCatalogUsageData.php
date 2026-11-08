<?php

declare(strict_types=1);

namespace App\Data\Admin;

use App\Contracts\Data;

/**
 * The specialties catalog grouped by profession, with platform-wide counts only (#418): see
 * `App\Support\SpecialtyCatalogUsage`.
 */
final readonly class SpecialtyCatalogUsageData implements Data
{
    /**
     * @param  list<array<string, mixed>>  $professions
     */
    public function __construct(
        public array $professions,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'professions' => $this->professions,
        ];
    }
}
