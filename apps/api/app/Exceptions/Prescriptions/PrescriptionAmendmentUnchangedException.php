<?php

declare(strict_types=1);

namespace App\Exceptions\Prescriptions;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * The amendment repeats the current items: it would add a version that
 * corrects nothing.
 */
final class PrescriptionAmendmentUnchangedException extends DomainException
{
    public function __construct(
        private readonly int $prescriptionId,
        private readonly int $currentVersion,
    ) {
        parent::__construct('The amendment repeats the current items of the indicated medication.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::PrescriptionsAmendmentUnchanged;
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
            'prescription_id' => $this->prescriptionId,
            'current_version' => $this->currentVersion,
        ];
    }
}
