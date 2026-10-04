<?php

declare(strict_types=1);

namespace App\Http\Resources\Subscriptions;

use App\Enums\SubscriptionStatus;
use App\Models\Subscription;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Subscription
 */
class SubscriptionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $subscription = $this->subscription();

        /** @var SubscriptionStatus $status */
        $status = $subscription->status;

        return [
            'status' => $status->value,
            'restricted' => $status->restrictsWrites(),
            'grace_ends_at' => $subscription->grace_ends_at?->toIso8601String(),
            'grace_days_left' => $this->graceDaysLeft($status, $subscription->grace_ends_at),
            'last_payment_at' => $subscription->last_payment_at?->toIso8601String(),
            'last_payment_failed_at' => $subscription->last_payment_failed_at?->toIso8601String(),
        ];
    }

    /**
     * Whole days remaining, rounded up: a grace period ending later today
     * still reads as one day left.
     */
    private function graceDaysLeft(SubscriptionStatus $status, ?CarbonImmutable $graceEndsAt): ?int
    {
        if ($status !== SubscriptionStatus::Grace || $graceEndsAt === null) {
            return null;
        }

        $seconds = CarbonImmutable::now()->diffInSeconds($graceEndsAt, false);

        return max(0, (int) ceil($seconds / 86400));
    }

    private function subscription(): Subscription
    {
        /** @var Subscription $subscription */
        $subscription = $this->resource;

        return $subscription;
    }
}
