<?php

declare(strict_types=1);

namespace App\Exceptions\Professionals;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * The registry holds no one under the DNI a user tried to load (#417): a DNI is kept only when the registry names
 * someone with it, whose name becomes the account's.
 */
final class ProfessionalDocumentNotInRegistryException extends DomainException
{
    public function __construct(private readonly int $userId)
    {
        parent::__construct('The professional registry holds no one under that document.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::ProfessionalsDocumentNotInRegistry;
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
