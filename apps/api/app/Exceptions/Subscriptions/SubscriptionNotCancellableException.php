<?php

declare(strict_types=1);

namespace App\Exceptions\Subscriptions;

use App\Enums\ErrorCode;
use App\Enums\SubscriptionStatus;
use App\Exceptions\DomainException;

/**
 * Thrown by CancelSubscriptionAction when the organization has no
 * subscription that could charge it: none at all, a checkout never paid
 * (`pending`) or one already cancelled.
 */
final class SubscriptionNotCancellableException extends DomainException
{
    public function __construct(
        private readonly int $organizationId,
        private readonly ?SubscriptionStatus $status,
    ) {
        parent::__construct('The organization subscription cannot be cancelled.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::SubscriptionsNotCancellable;
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
            'subscription_status' => $this->status?->value,
        ];
    }

    /**
     * The status is the organization's own, like SubscriptionInactiveException's.
     *
     * @return array<string, mixed>
     */
    public function publicContext(): array
    {
        return [
            'subscription_status' => $this->status?->value,
        ];
    }
}
