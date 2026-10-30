<?php

declare(strict_types=1);

namespace App\Exceptions\ClinicalAccess;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * The code only goes to one of the patient's confirmed email addresses, the ones that get the reminder (#364, #365).
 */
final class AccessCodeContactUnavailableException extends DomainException
{
    public function __construct(
        private readonly int $contactId,
    ) {
        parent::__construct('The contact cannot receive the access code.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::ClinicalAccessContactUnavailable;
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
        return [
            'contact_id' => $this->contactId,
        ];
    }
}
