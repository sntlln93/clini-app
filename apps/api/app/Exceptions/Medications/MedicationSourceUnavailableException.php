<?php

declare(strict_types=1);

namespace App\Exceptions\Medications;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;
use Throwable;

/**
 * The medication source didn't answer, or answered something its adapter can't read (#377): a network error or a
 * timeout, a non-2xx response, or a body that isn't the list it expects. The catalog falls back to what it holds, so
 * this never reaches the panel.
 */
final class MedicationSourceUnavailableException extends DomainException
{
    /**
     * @param  string  $step  what failed: the request itself, its status or the response's body
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
     * Never the term searched: only what failed.
     *
     * @return array<string, mixed>
     */
    public function logContext(): array
    {
        return ['step' => $this->step];
    }
}
