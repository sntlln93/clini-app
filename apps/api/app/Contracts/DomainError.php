<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Enums\ErrorCode;
use Throwable;

interface DomainError extends Throwable
{
    public function errorCode(): ErrorCode;

    public function httpStatus(): int;

    /**
     * Logged, never serialized into the HTTP response.
     *
     * @return array<string, mixed>
     */
    public function logContext(): array;

    /**
     * Exposed to the client: each datum needs explicit justification in the overriding method.
     *
     * @return array<string, mixed>
     */
    public function publicContext(): array;
}
