<?php

declare(strict_types=1);

namespace App\Exceptions\ClinicalAccess;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * The appointment no longer brings a code: it was cancelled or rescheduled, or its window is over (#364, ADR 0029).
 */
final class AccessCodeUnavailableException extends DomainException
{
    public function __construct(
        private readonly int $appointmentId,
    ) {
        parent::__construct('The appointment has no access code to send.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::ClinicalAccessCodeUnavailable;
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
            'appointment_id' => $this->appointmentId,
        ];
    }
}
