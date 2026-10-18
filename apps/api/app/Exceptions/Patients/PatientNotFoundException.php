<?php

declare(strict_types=1);

namespace App\Exceptions\Patients;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * A miss has no patient id to log, and the searched document is personal data — of someone who may not even be a patient — so the log carries nothing.
 */
final class PatientNotFoundException extends DomainException
{
    public function __construct()
    {
        parent::__construct('No patient matches the given document.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::PatientsNotFound;
    }

    public function httpStatus(): int
    {
        return 404;
    }

    /**
     * @return array<string, mixed>
     */
    public function logContext(): array
    {
        return [];
    }
}
