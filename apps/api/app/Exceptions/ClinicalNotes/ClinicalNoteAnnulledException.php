<?php

declare(strict_types=1);

namespace App\Exceptions\ClinicalNotes;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * The note was annulled: it stays in the history as it was, so it can be
 * neither amended nor annulled again.
 */
final class ClinicalNoteAnnulledException extends DomainException
{
    public function __construct(
        private readonly int $clinicalNoteId,
    ) {
        parent::__construct('The clinical note is annulled.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::ClinicalNotesAnnulled;
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
        ];
    }
}
