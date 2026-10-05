<?php

declare(strict_types=1);

namespace App\Exceptions\Subscriptions;

use App\Enums\ErrorCode;
use App\Enums\SubscriptionStatus;
use App\Exceptions\DomainException;

/**
 * Thrown by ExtendSubscriptionGraceAction when an operator tries to extend
 * the grace period of a subscription that is neither in grace nor expired.
 */
final class GraceExtensionNotAllowedException extends DomainException
{
    public function __construct(
        private readonly int $subscriptionId,
        private readonly SubscriptionStatus $status,
    ) {
        parent::__construct('The grace period can only be extended for a subscription in grace or expired.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::SubscriptionsGraceExtensionNotAllowed;
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
            'subscription_id' => $this->subscriptionId,
            'subscription_status' => $this->status->value,
        ];
    }

    /**
     * Only ever returned to a platform operator, and it drives the
     * dashboard's copy (which status blocked the extension).
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
