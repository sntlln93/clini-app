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
    public function __construct(
        private readonly string $slug,
    ) {
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
        return [
            'slug' => $this->slug,
        ];
    }
}
