<?php

declare(strict_types=1);

namespace App\Exceptions\MedicalHistory;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * The background entry no longer applies: it stays in the history as it was, so it can be neither amended nor withdrawn again.
 */
final class MedicalHistoryEntryWithdrawnException extends DomainException
{
    public function __construct(
        private readonly int $entryId,
    ) {
        parent::__construct('The background entry is withdrawn.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::MedicalHistoryWithdrawn;
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
