<?php

declare(strict_types=1);

namespace App\Exceptions\Booking;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * Thrown by ResolvePublicOrganization when the slug matches neither an organization nor an active professional's public link, so the public booking page can tell a mistyped or removed link apart from an unexpected failure.
 */
final class BookingLinkNotFoundException extends DomainException
{
    public function __construct()
    {
        parent::__construct('No booking link matches this slug.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::BookingLinkNotFound;
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
        // A professional's public slug is usually their name, and a mistyped one may name anyone.
        return [];
    }
}
