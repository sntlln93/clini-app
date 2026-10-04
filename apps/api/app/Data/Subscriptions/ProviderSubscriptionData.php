<?php

declare(strict_types=1);

namespace App\Data\Subscriptions;

use App\Contracts\Data;
use App\Enums\SubscriptionStatus;
use Carbon\CarbonImmutable;

/**
 * A provider-side subscription, normalized by the adapter. `status` is
 * null for a provider state with no direct domain status; `paused` flags
 * one that stopped charging without being cancelled (no further charge, so
 * no failed charge, will ever reach the webhook for it). `nextPaymentAt` is
 * the provider's next scheduled charge, null when it reports none.
 */
final readonly class ProviderSubscriptionData implements Data
{
    public function __construct(
        public string $id,
        public ?SubscriptionStatus $status,
        public ?string $initPoint,
        public bool $paused = false,
        public ?CarbonImmutable $nextPaymentAt = null,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status?->value,
            'init_point' => $this->initPoint,
            'paused' => $this->paused,
            'next_payment_at' => $this->nextPaymentAt?->toIso8601String(),
        ];
    }
}
