<?php

declare(strict_types=1);

namespace App\Exceptions\Plans;

use App\Enums\ErrorCode;
use App\Enums\SubscriptionStatus;
use App\Exceptions\DomainException;

/**
 * An operator tried to assign Center while the organization's Mercado Pago
 * subscription can still charge: the owner cancels it first, so the
 * organization is never billed twice.
 */
final class PlanSubscriptionLiveException extends DomainException
{
    public function __construct(
        private readonly int $organizationId,
        private readonly SubscriptionStatus $status,
    ) {
        parent::__construct('The organization still has a subscription that can charge.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::PlansSubscriptionLive;
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
     * @return array<string, mixed>
     */
    public function publicContext(): array
    {
        return ['subscription_status' => $this->status->value];
    }
}
