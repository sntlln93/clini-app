<?php

declare(strict_types=1);

namespace App\Exceptions\Subscriptions;

use App\Enums\ErrorCode;
use App\Enums\SubscriptionStatus;
use App\Exceptions\DomainException;

/**
 * Thrown by EnsureSubscriptionActive when an expired or cancelled
 * organization attempts a write on appointments, clinical notes,
 * prescriptions, availability or public booking: they stay read-only until
 * the subscription is regularized.
 */
final class SubscriptionInactiveException extends DomainException
{
    public function __construct(
        private readonly int $organizationId,
        private readonly SubscriptionStatus $status,
    ) {
        parent::__construct('The organization subscription is not active.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::SubscriptionsInactive;
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
            'subscription_status' => $this->status->value,
        ];
    }

    /**
     * The status is the organization's own and drives the panel's copy
     * (expired vs cancelled), so it is safe and useful to expose.
     *
     * @return array<string, mixed>
     */
    public function publicContext(): array
    {
        return [
            'subscription_status' => $this->status->value,
        ];
    }
}
