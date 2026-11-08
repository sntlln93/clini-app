<?php

declare(strict_types=1);

namespace App\Data\Invoices;

use App\Contracts\Data;
use App\Data\Subscriptions\ProviderPaymentData;
use App\Models\Subscription;

/**
 * An approved charge of a subscription, to record its invoice.
 */
final readonly class ChargeInvoiceData implements Data
{
    public function __construct(
        public Subscription $subscription,
        public string $provider,
        public ProviderPaymentData $payment,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'subscription_id' => $this->subscription->id,
            'provider' => $this->provider,
            'payment' => $this->payment->toArray(),
        ];
    }
}
