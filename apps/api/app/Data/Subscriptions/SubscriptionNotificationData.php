<?php

declare(strict_types=1);

namespace App\Data\Subscriptions;

use App\Contracts\Data;

/**
 * One incoming provider webhook notification, before verification.
 */
final readonly class SubscriptionNotificationData implements Data
{
    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(
        public ?string $notificationId,
        public ?string $type,
        public ?string $resourceId,
        public WebhookSignatureData $signature,
        public array $payload,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'notification_id' => $this->notificationId,
            'type' => $this->type,
            'resource_id' => $this->resourceId,
            'signature' => $this->signature->toArray(),
            'payload' => $this->payload,
        ];
    }
}
