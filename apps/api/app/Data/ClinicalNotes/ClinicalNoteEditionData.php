<?php

declare(strict_types=1);

namespace App\Data\ClinicalNotes;

use App\Contracts\Data;

final readonly class ClinicalNoteEditionData implements Data
{
    public function __construct(
        public int $clinicalNoteId,
        public string $body,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'clinicalNoteId' => $this->clinicalNoteId,
            'body' => $this->body,
        ];
    }
}
