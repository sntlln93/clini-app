<?php

declare(strict_types=1);

namespace App\Exceptions\MedicalHistory;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * The blood type is already the current one: recording it again would add a value that changes nothing.
 */
final class BloodTypeUnchangedException extends DomainException
{
    public function __construct(
        private readonly int $patientId,
    ) {
        parent::__construct('The blood type is already the current one.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::MedicalHistoryBloodTypeUnchanged;
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
