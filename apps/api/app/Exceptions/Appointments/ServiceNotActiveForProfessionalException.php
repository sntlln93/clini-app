<?php

declare(strict_types=1);

namespace App\Exceptions\Appointments;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * Thrown when a booking targets a service the professional does not have
 * active (`BookAppointmentAction`).
 */
final class ServiceNotActiveForProfessionalException extends DomainException
{
    public function __construct(
        private readonly int $membershipId,
        private readonly int $serviceId,
    ) {
        parent::__construct('The professional does not have this service active.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::AppointmentsServiceNotActiveForProfessional;
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
            'membership_id' => $this->membershipId,
            'service_id' => $this->serviceId,
        ];
    }
}
