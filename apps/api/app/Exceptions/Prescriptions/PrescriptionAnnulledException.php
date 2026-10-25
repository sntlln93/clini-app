<?php

declare(strict_types=1);

namespace App\Exceptions\Prescriptions;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * The indicated medication was annulled: it stays in the history as it was,
 * so it can be neither amended nor annulled again (#344).
 */
final class PrescriptionAnnulledException extends DomainException
{
    public function __construct(
        private readonly int $prescriptionId,
    ) {
        parent::__construct('The prescription is annulled.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::PrescriptionsAnnulled;
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
        ];
    }
}
