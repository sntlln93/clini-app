<?php

declare(strict_types=1);

namespace App\Data\Subscriptions;

use App\Contracts\Data;

/**
 * What a SubscriptionGateway needs to create a recurring monthly
 * subscription; the return URL comes from the adapter's own config.
 */
final readonly class SubscriptionSignupData implements Data
{
    public function __construct(
        public string $externalReference,
        public string $payerEmail,
        public string $reason,
        public int $amount,
        public string $currency,
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
            'amount' => $this->amount,
            'currency' => $this->currency,
        ];
    }
}
