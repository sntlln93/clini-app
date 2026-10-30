<?php

declare(strict_types=1);

namespace App\Data\Prescriptions;

use App\Contracts\Data;

/**
 * One allergy «Indicar igual» confirmed (#362): the version the warning matched, and whether it showed its detail.
 * It confirms only that: a newer version, or the same one now shown otherwise, warns again.
 */
final readonly class AllergyConfirmationData implements Data
{
    public function __construct(
        public int $entryVersionId,
        public bool $detailShown,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'entryVersionId' => $this->entryVersionId,
            'detailShown' => $this->detailShown,
        ];
    }
}
