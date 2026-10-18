<?php

declare(strict_types=1);

namespace App\Data\ClinicalNotes;

use App\Contracts\Data;

final readonly class ClinicalNoteAmendmentData implements Data
{
    public function __construct(
        public int $clinicalNoteId,
        public int $membershipId,
        public string $body,
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
            'reason' => $this->reason,
        ];
    }
}
