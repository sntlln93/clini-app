<?php

declare(strict_types=1);

namespace App\Data\Subscriptions;

use App\Contracts\Data;
use App\Enums\SubscriptionPaymentOutcome;
use Carbon\CarbonImmutable;

/**
 * One recurring charge of a provider subscription, normalized by the
 * adapter. `outcome` is null while the charge is still unresolved
 * (scheduled, in process). `chargedAt` is the date of the billing period the
 * charge belongs to — the same across every retry of that charge — so
 * notifications delivered out of order can be told apart; null when the
 * provider didn't report one. `amountCents` and `currency` are what the
 * charge collected (#246), which its invoice bills; null when the provider
 * didn't report them.
 */
final readonly class ProviderPaymentData implements Data
{
    public function __construct(
        public string $id,
        public ?string $providerSubscriptionId,
        public ?SubscriptionPaymentOutcome $outcome,
        public ?CarbonImmutable $chargedAt = null,
        public ?int $amountCents = null,
        public ?string $currency = null,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'provider_subscription_id' => $this->providerSubscriptionId,
            'outcome' => $this->outcome?->value,
            'charged_at' => $this->chargedAt?->toIso8601String(),
            'amount_cents' => $this->amountCents,
            'currency' => $this->currency,
        ];
    }
}
