<?php

declare(strict_types=1);

namespace App\Data\ClinicalNotes;

use App\Contracts\Data;

final readonly class ClinicalNoteAmendmentData implements Data
{
    /**
     * @param  list<int>|null  $icd10CodeIds  the new version's diagnoses, in
     *                                        order (#324); null keeps the current ones
     */
    public function __construct(
        public int $clinicalNoteId,
        public int $membershipId,
        public string $body,
        public ?array $icd10CodeIds,
        public ?string $reason,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'clinicalNoteId' => $this->clinicalNoteId,
            'membershipId' => $this->membershipId,
            'body' => $this->body,
            'icd10CodeIds' => $this->icd10CodeIds,
            'reason' => $this->reason,
        ];
    }
}
