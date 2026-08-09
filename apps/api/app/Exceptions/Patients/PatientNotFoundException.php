<?php

declare(strict_types=1);

namespace App\Exceptions\Patients;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * Patients are global entities, not per-organization, so no patient identifier exists to leak here.
 */
final class PatientNotFoundException extends DomainException
{
    public function __construct(
        private readonly string $documentType,
        private readonly string $documentNumber,
    ) {
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
        return [
            'document_type' => $this->documentType,
            'document_number' => $this->documentNumber,
        ];
    }
}
