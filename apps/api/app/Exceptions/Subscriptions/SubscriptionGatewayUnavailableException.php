<?php

declare(strict_types=1);

namespace App\Exceptions\Subscriptions;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;
use Throwable;

/**
 * Thrown when the payment provider fails — a network error, a non-2xx
 * response (except a 404 on a resource lookup, which the gateway reports
 * as a missing resource instead), or a payload missing the fields the
 * adapter needs. On a webhook this non-2xx answer makes the provider
 * redeliver later.
 */
final class SubscriptionGatewayUnavailableException extends DomainException
{
    public function __construct(
        private readonly string $endpoint,
        private readonly ?int $status = null,
        ?Throwable $previous = null,
    ) {
        parent::__construct('The payment provider is unavailable.', previous: $previous);
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::SubscriptionsGatewayUnavailable;
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
            'endpoint' => $this->endpoint,
            'provider_status' => $this->status,
        ];
    }
}
