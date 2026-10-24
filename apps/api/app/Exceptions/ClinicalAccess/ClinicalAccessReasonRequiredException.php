<?php

declare(strict_types=1);

namespace App\Exceptions\ClinicalAccess;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * The professional may read the patient's history, but has no appointment with them near today and no open
 * exceptional access: the history opens once they give a reason (#325, ADR 0022).
 */
final class ClinicalAccessReasonRequiredException extends DomainException
{
    public function __construct(
        private readonly int $patientId,
    ) {
        parent::__construct('Opening this clinical history requires a reason.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::ClinicalAccessReasonRequired;
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
