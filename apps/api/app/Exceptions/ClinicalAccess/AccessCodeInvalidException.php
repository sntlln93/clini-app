<?php

declare(strict_types=1);

namespace App\Exceptions\ClinicalAccess;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * The code typed matches none of the patient's codes the professional may redeem: one issued for an appointment of
 * theirs with the patient, not redeemed yet, still within its window (#364, ADR 0029). A wrong code, someone else's
 * and a spent one answer the same, so the answer never tells them apart.
 */
final class AccessCodeInvalidException extends DomainException
{
    public function __construct(
        private readonly int $patientId,
    ) {
        parent::__construct('The access code is not valid.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::ClinicalAccessCodeInvalid;
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
