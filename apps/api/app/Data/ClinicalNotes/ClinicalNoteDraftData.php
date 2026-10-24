<?php

declare(strict_types=1);

namespace App\Data\ClinicalNotes;

use App\Contracts\Data;

final readonly class ClinicalNoteDraftData implements Data
{
    /**
     * @param  list<int>  $icd10CodeIds  the note's diagnoses, in order (#324)
     */
    public function __construct(
        public int $organizationId,
        public int $appointmentId,
        public int $patientId,
        public int $membershipId,
        public string $body,
        public array $icd10CodeIds,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'organizationId' => $this->organizationId,
            'appointmentId' => $this->appointmentId,
            'patientId' => $this->patientId,
            'membershipId' => $this->membershipId,
            'body' => $this->body,
            'icd10CodeIds' => $this->icd10CodeIds,
        ];
    }
}
