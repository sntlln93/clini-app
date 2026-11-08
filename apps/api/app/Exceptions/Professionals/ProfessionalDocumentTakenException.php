<?php

declare(strict_types=1);

namespace App\Exceptions\Professionals;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * The DNI already belongs to another account (#417): one DNI, one account, found by its blind index.
 */
final class ProfessionalDocumentTakenException extends DomainException
{
    public function __construct(private readonly ?int $userId)
    {
        parent::__construct('The document already belongs to another account.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::ProfessionalsDocumentTaken;
    }

    public function httpStatus(): int
    {
        return 409;
    }

    /**
     * Never the DNI: only internal ids and counts.
     *
     * @return array<string, mixed>
     */
    public function logContext(): array
    {
        return ['user_id' => $this->userId];
    }
}
