<?php

declare(strict_types=1);

namespace App\Data\ClinicalAccess;

use App\Contracts\Data;

/**
 * The patients whose history went into one export, each to be logged in their own access trail.
 */
final readonly class ExportedPatientsData implements Data
{
    /**
     * @param  list<int>  $patientIds
     */
    public function __construct(
        public int $organizationId,
        public int $membershipId,
        public int $clinicalRecordExportId,
        public array $patientIds,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'organizationId' => $this->organizationId,
            'membershipId' => $this->membershipId,
            'clinicalRecordExportId' => $this->clinicalRecordExportId,
            'patientIds' => $this->patientIds,
        ];
    }
}
