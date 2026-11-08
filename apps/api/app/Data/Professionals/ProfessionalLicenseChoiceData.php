<?php

declare(strict_types=1);

namespace App\Data\Professionals;

use App\Contracts\Data;

/**
 * A license the registry holds for a professional's DNI, and whether they want it in Clini (#387).
 */
final readonly class ProfessionalLicenseChoiceData implements Data
{
    public function __construct(
        public int $licenseId,
        public bool $inClini,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'licenseId' => $this->licenseId,
            'inClini' => $this->inClini,
        ];
    }
}
