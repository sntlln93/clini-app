<?php

declare(strict_types=1);

namespace App\Data\Subscriptions;

use App\Contracts\Data;

/**
 * What a SubscriptionGateway needs to create a recurring subscription;
 * amount, currency and return URL come from the adapter's own config.
 */
final readonly class SubscriptionSignupData implements Data
{
    public function __construct(
        public string $externalReference,
        public string $payerEmail,
        public string $reason,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'external_reference' => $this->externalReference,
            'payer_email' => $this->payerEmail,
            'reason' => $this->reason,
        ];
    }
}
