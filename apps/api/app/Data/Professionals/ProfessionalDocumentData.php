<?php

declare(strict_types=1);

namespace App\Data\Professionals;

use App\Contracts\Data;

/**
 * The DNI a professional declares to have their licenses checked (#380); null takes it away.
 */
final readonly class ProfessionalDocumentData implements Data
{
    public function __construct(
        public int $userId,
        public ?string $documentNumber,
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
            'hasDocumentNumber' => $this->documentNumber !== null,
        ];
    }
}
