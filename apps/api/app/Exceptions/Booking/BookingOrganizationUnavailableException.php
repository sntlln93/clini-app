<?php

declare(strict_types=1);

namespace App\Exceptions\Booking;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * Thrown by ResolvePublicOrganization when the slug resolves to a suspended organization (directly or through a professional membership slug).
 */
final class BookingOrganizationUnavailableException extends DomainException
{
    public function __construct(
        private readonly int $organizationId,
    ) {
        parent::__construct('The organization is not accepting online bookings.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::BookingOrganizationUnavailable;
    }

    public function httpStatus(): int
    {
        return 403;
    }

    /**
     * @return array<string, mixed>
     */
    public function logContext(): array
    {
        return [
            'organization_id' => $this->organizationId,
        ];
    }
}
