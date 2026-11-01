<?php

declare(strict_types=1);

namespace App\Exceptions\Professionals;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;
use Throwable;

/**
 * The professional registry didn't answer, or answered something its adapter can't read (#380): a network error or a
 * timeout, a non-2xx response, a form it can't find or a page that is neither results nor «no results». The license
 * stays as it was (unverified when new), so this never reaches the panel.
 */
final class ProfessionalRegistryUnavailableException extends DomainException
{
    /**
     * @param  string  $step  what failed: the request itself, its status, the form or the response's body
     */
    public function __construct(
        private readonly string $step,
        ?Throwable $previous = null,
    ) {
        parent::__construct('The professional registry is unavailable.', previous: $previous);
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::ProfessionalsRegistryUnavailable;
    }

    public function httpStatus(): int
    {
        return 503;
    }

    /**
     * Never the DNI looked up: only what failed.
     *
     * @return array<string, mixed>
     */
    public function logContext(): array
    {
        return ['step' => $this->step];
    }
}
