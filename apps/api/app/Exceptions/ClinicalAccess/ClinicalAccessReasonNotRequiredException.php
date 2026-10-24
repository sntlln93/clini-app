<?php

declare(strict_types=1);

namespace App\Exceptions\ClinicalAccess;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * The professional has an appointment with the patient near today, so the history is already open: an exceptional
 * access would only put a false one on the owner's list (#325, ADR 0022).
 */
final class ClinicalAccessReasonNotRequiredException extends DomainException
{
    public function __construct(
        private readonly int $patientId,
    ) {
        parent::__construct('This clinical history is open without a reason.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::ClinicalAccessReasonNotRequired;
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
            'patient_id' => $this->patientId,
        ];
    }
}
