<?php

declare(strict_types=1);

namespace App\Exceptions\Contact;

use App\Enums\ContactRequestStatus;
use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * An operator set the status the request already has — typically another
 * operator changed it first: nothing to audit.
 */
final class ContactRequestStatusUnchangedException extends DomainException
{
    public function __construct(
        private readonly int $contactRequestId,
        private readonly ContactRequestStatus $status,
    ) {
        parent::__construct('The contact request already has this status.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::ContactRequestsStatusUnchanged;
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
            'contact_request_id' => $this->contactRequestId,
            'status' => $this->status->value,
        ];
    }
}
