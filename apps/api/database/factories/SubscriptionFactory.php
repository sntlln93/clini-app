<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\SubscriptionGraceReason;
use App\Enums\SubscriptionStatus;
use App\Models\Organization;
use App\Models\Subscription;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Subscription>
 */
class SubscriptionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'provider' => Subscription::PROVIDER_MERCADOPAGO,
            'provider_subscription_id' => 'preapproval-'.fake()->unique()->numberBetween(1, 9999999),
            'status' => SubscriptionStatus::Active,
        ];
    }

    public function withStatus(SubscriptionStatus $status): static
    {
        return $this->state(fn (array $attributes): array => ['status' => $status]);
    }

    public function inGrace(\DateTimeInterface $endsAt, SubscriptionGraceReason $reason = SubscriptionGraceReason::PaymentFailed): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => SubscriptionStatus::Grace,
            'grace_ends_at' => $endsAt,
            'grace_reason' => $reason,
        ]);
    }
}
