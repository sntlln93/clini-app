<?php

declare(strict_types=1);

namespace App\Data\ClinicalRecords;

use App\Contracts\Data;
use App\Enums\ClinicalRecordExportFormat;
use App\Enums\ClinicalRecordExportScope;

final readonly class ClinicalRecordExportData implements Data
{
    /**
     * @param  int|null  $patientId  null when the scope is every attended patient
     */
    public function __construct(
        public int $organizationId,
        public int $membershipId,
        public ?int $patientId,
        public ClinicalRecordExportScope $scope,
        public ClinicalRecordExportFormat $format,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'organizationId' => $this->organizationId,
            'membershipId' => $this->membershipId,
            'patientId' => $this->patientId,
            'scope' => $this->scope->value,
            'format' => $this->format->value,
        ];
    }
}
