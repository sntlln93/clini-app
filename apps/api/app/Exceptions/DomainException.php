<?php

declare(strict_types=1);

namespace App\Exceptions;

use App\Contracts\DomainError;
use Exception;

/**
 * `httpStatus()` is abstract on purpose: every concrete exception states its own status.
 */
abstract class DomainException extends Exception implements DomainError
{
    abstract public function httpStatus(): int;

    /**
     * @return array<string, mixed>
     */
    public function publicContext(): array
    {
        return [];
    }
}
