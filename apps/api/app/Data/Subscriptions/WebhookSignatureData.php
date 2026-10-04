<?php

declare(strict_types=1);

namespace App\Data\Subscriptions;

use App\Contracts\Data;

/**
 * The raw pieces of a webhook request its signature is computed over.
 */
final readonly class WebhookSignatureData implements Data
{
    public function __construct(
        public ?string $signature,
        public ?string $requestId,
        public ?string $resourceId,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'signature' => $this->signature,
            'request_id' => $this->requestId,
            'resource_id' => $this->resourceId,
        ];
    }
}
