<?php

declare(strict_types=1);

namespace App\Exceptions\Subscriptions;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;
use Carbon\CarbonImmutable;

/**
 * Thrown by ExtendSubscriptionGraceAction when the subscription is in grace
 * and the requested end is not strictly later than the current one: the
 * operation is an extension, never a shortening.
 */
final class GraceExtensionNotLaterException extends DomainException
{
    public function __construct(
        private readonly int $subscriptionId,
        private readonly CarbonImmutable $current,
        private readonly CarbonImmutable $requested,
    ) {
        parent::__construct('The new grace period end must be later than the current one.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::SubscriptionsGraceExtensionNotLater;
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
            'current_grace_ends_at' => $this->current->toIso8601String(),
            'requested_grace_ends_at' => $this->requested->toIso8601String(),
        ];
    }

    /**
     * Only ever returned to a platform operator, who needs the current end
     * to pick a valid later date.
     *
     * @return array<string, mixed>
     */
    public function publicContext(): array
    {
        return [
            'current_grace_ends_at' => $this->current->toIso8601String(),
        ];
    }
}
