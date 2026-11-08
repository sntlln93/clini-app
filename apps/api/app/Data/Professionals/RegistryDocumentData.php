<?php

declare(strict_types=1);

namespace App\Data\Professionals;

use App\Contracts\Data;

/**
 * A DNI to look up in the professional registry (#417).
 */
final readonly class RegistryDocumentData implements Data
{
    public function __construct(
        public string $documentNumber,
    ) {}

    /**
     * Never the DNI itself.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [];
    }
}
