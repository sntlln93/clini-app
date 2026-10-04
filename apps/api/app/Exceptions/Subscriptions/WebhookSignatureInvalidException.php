<?php

declare(strict_types=1);

namespace App\Exceptions\Subscriptions;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * Thrown when a payment-provider webhook's signature is missing or does
 * not match: the notification is not trusted and nothing is processed.
 */
final class WebhookSignatureInvalidException extends DomainException
{
    public function __construct(
        private readonly ?string $requestId,
    ) {
        parent::__construct('The webhook signature is invalid.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::SubscriptionsWebhookSignatureInvalid;
    }

    public function httpStatus(): int
    {
        return 401;
    }

    /**
     * @return array<string, mixed>
     */
    public function logContext(): array
    {
        return [
            'request_id' => $this->requestId,
        ];
    }
}
