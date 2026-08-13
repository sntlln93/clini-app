<?php

declare(strict_types=1);

namespace App\Exceptions\Holidays;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;
use Throwable;

/**
 * Thrown when the external holiday source fails in a way that isn't the
 * documented "no provincial coverage" 404 — a network error, a non-2xx
 * response, or a payload that can't be parsed into `HolidayData`.
 */
final class HolidayProviderUnavailableException extends DomainException
{
    public function __construct(
        private readonly string $url,
        ?Throwable $previous = null,
    ) {
        parent::__construct('The external holiday provider is unavailable.', previous: $previous);
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::HolidaysProviderUnavailable;
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
            'url' => $this->url,
        ];
    }
}
