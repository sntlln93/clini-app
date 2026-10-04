<?php

declare(strict_types=1);

namespace App\Exceptions\Subscriptions;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * Thrown when an owner starts a checkout for an organization whose
 * subscription is already active — a second provider subscription would
 * charge it twice.
 */
final class SubscriptionAlreadyActiveException extends DomainException
{
    public function __construct(
        private readonly int $organizationId,
    ) {
        parent::__construct('The organization subscription is already active.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::SubscriptionsAlreadyActive;
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
            'organization_id' => $this->organizationId,
        ];
    }
}
