<?php

declare(strict_types=1);

namespace App\Data\Professionals;

use App\Contracts\Data;

/**
 * The DNI a user loads into their account (#380, #417), once: the registry gives the account its name and licenses.
 */
final readonly class ProfessionalDocumentData implements Data
{
    public function __construct(
        public int $userId,
        public string $documentNumber,
    ) {}

    /**
     * Never the DNI itself.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'userId' => $this->userId,
        ];
    }
}
