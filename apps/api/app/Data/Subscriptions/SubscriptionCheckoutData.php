<?php

declare(strict_types=1);

namespace App\Data\Subscriptions;

use App\Contracts\Data;

/**
 * An owner's request to start (or resume) the organization's subscription
 * checkout.
 */
final readonly class SubscriptionCheckoutData implements Data
{
    public function __construct(
        public int $organizationId,
        public string $payerEmail,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'organization_id' => $this->organizationId,
            'payer_email' => $this->payerEmail,
        ];
    }
}
