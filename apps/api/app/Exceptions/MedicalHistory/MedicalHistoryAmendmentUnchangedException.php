<?php

declare(strict_types=1);

namespace App\Exceptions\MedicalHistory;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * The amendment repeats the current text: it would add a version that corrects nothing.
 */
final class MedicalHistoryAmendmentUnchangedException extends DomainException
{
    public function __construct(
        private readonly int $entryId,
    ) {
        parent::__construct('The amendment repeats the current text of the background entry.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::MedicalHistoryAmendmentUnchanged;
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
            'medical_history_entry_id' => $this->entryId,
        ];
    }
}
