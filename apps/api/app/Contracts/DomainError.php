<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Enums\ErrorCode;
use Throwable;

/**
 * The single contract between the backend and its consumers for expected,
 * business-rule failures. `catch`/`render` must operate on this interface,
 * never on the abstract base class `App\Exceptions\DomainException` — a
 * `catch (DomainException)` without the right `use` could otherwise
 * silently catch SPL's own `\DomainException` instead.
 */
interface DomainError extends Throwable
{
    public function errorCode(): ErrorCode;

    public function httpStatus(): int;

    /**
     * Rich, developer-facing context. Logged, never serialized into the
     * HTTP response.
     *
     * @return array<string, mixed>
     */
    public function logContext(): array;

    /**
     * Context safe to expose to the client. Empty by default — exposing a
     * datum here requires explicit justification in the overriding method.
     *
     * @return array<string, mixed>
     */
    public function publicContext(): array;
}
