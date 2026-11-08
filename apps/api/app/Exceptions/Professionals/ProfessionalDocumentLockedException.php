<?php

declare(strict_types=1);

namespace App\Exceptions\Professionals;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * The professional already added to Clini a license the registry holds for their DNI (#387, ADR 0038), so the DNI is
 * settled: only support changes it (`user:reset-professional-document`).
 */
final class ProfessionalDocumentLockedException extends DomainException
{
    public function __construct()
    {
        parent::__construct('The professional document is locked.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::ProfessionalsDocumentLocked;
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
        return [];
    }
}
