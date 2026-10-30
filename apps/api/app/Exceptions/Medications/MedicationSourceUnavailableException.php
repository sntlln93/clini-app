<?php

declare(strict_types=1);

namespace App\Exceptions\Medications;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;
use Throwable;

/**
 * The national vademecum didn't answer, or answered something its adapter can't read (#377): a network error, a
 * non-2xx response, a session it can't open, or a page whose structure changed. The catalog falls back to what it
 * holds, so this never reaches the panel.
 */
final class MedicationSourceUnavailableException extends DomainException
{
    /**
     * @param  string  $step  which request of the lookup failed: the listing page, the search, the click or the detail
     */
    public function __construct(
        private readonly string $step,
        ?Throwable $previous = null,
    ) {
        parent::__construct('The medication source is unavailable.', previous: $previous);
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::MedicationsSourceUnavailable;
    }

    public function httpStatus(): int
    {
        return 503;
    }

    /**
     * Never the term searched: only which step failed.
     *
     * @return array<string, mixed>
     */
    public function logContext(): array
    {
        return ['step' => $this->step];
    }
}
