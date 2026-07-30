<?php

declare(strict_types=1);

namespace App\Exceptions;

use App\Contracts\DomainError;
use Exception;

/**
 * Abstract base for every domain error. The only file allowed at the root
 * of `app/Exceptions/` — concrete exceptions live one level down, in
 * `app/Exceptions/<Module>/`, per the repo's per-module convention.
 *
 * `httpStatus()` is intentionally abstract, with no default: every
 * concrete exception must state its own status explicitly.
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
