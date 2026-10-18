<?php

declare(strict_types=1);

namespace App\Exceptions\ClinicalNotes;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * The amendment repeats the current text: it would add a version that
 * corrects nothing.
 */
final class ClinicalNoteAmendmentUnchangedException extends DomainException
{
    public function __construct(
        private readonly int $clinicalNoteId,
        private readonly int $currentVersion,
    ) {
        parent::__construct('The amendment repeats the current text of the clinical note.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::ClinicalNotesAmendmentUnchanged;
    }

    public function httpStatus(): int
    {
        return 409;
    }

    /**
     * @return array<string, mixed>
     */
    public function logContext(): array
    {
        return [
            'clinical_note_id' => $this->clinicalNoteId,
            'current_version' => $this->currentVersion,
        ];
    }
}
