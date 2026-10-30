<?php

declare(strict_types=1);

namespace App\Data\Patients;

use App\Contracts\Data;
use App\Enums\DocumentType;

final readonly class PatientLookupData implements Data
{
    public function __construct(
        public int $organizationId,
        public int $membershipId,
        public DocumentType $documentType,
        public string $documentNumber,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'organizationId' => $this->organizationId,
            'membershipId' => $this->membershipId,
            'documentType' => $this->documentType,
            'documentNumber' => $this->documentNumber,
        ];
    }
}
