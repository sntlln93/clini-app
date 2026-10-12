<?php

declare(strict_types=1);

namespace App\Exceptions\Patients;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * Only reached when a concurrent registration claims the same member number
 * after validation passed; the form normally rejects it with a 422 first.
 */
final class InsuranceMemberNumberTakenException extends DomainException
{
    public function __construct(
        private readonly int $insuranceProviderId,
    ) {
        parent::__construct('The insurance member number is already registered for another patient.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::PatientsInsuranceMemberNumberTaken;
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
        return ['insurance_provider_id' => $this->insuranceProviderId];
    }
}
