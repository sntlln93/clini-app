<?php

declare(strict_types=1);

namespace App\Exceptions\ClinicalNotes;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * A diagnosis being added uses an ICD-10 code the catalog has retired
 * (ADR 0020): it can stay on a note that already had it, but never be
 * added. The code itself is clinical content, so it is not logged.
 */
final class ClinicalNoteDiagnosisRetiredException extends DomainException
{
    public function __construct()
    {
        parent::__construct('An ICD-10 code being added to the clinical note is retired.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::ClinicalNotesDiagnosisRetired;
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
        return [];
    }
}
