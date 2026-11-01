<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\SubscriptionStatus;
use App\Models\Organization;
use App\Models\Subscription;
use App\Notifications\Subscriptions\SubscriptionExpiredNotification;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Notification;

/**
 * Expiring makes the agenda read-only; a later successful charge still reactivates it through the webhook.
 */
#[Description('Expires subscriptions whose grace period has ended without a successful payment')]
#[Signature('subscriptions:expire-grace')]
class ExpireSubscriptionGraceCommand extends Command
{
    public function handle(): int
    {
        $subscriptions = Subscription::withoutGlobalScope('organization')
            ->where('status', SubscriptionStatus::Grace)
            ->where('grace_ends_at', '<=', now())
            ->get();

        foreach ($subscriptions as $subscription) {
            $this->expire($subscription);
        }

        return self::SUCCESS;
    }

    private function expire(Subscription $subscription): void
    {
        // Conditional update: a webhook reactivation, or a fresh grace period opened after it, wins.
        $updated = Subscription::withoutGlobalScope('organization')
            ->whereKey($subscription->id)
            ->where('status', SubscriptionStatus::Grace)
            ->where('grace_ends_at', '<=', now())
            ->update(['status' => SubscriptionStatus::Expired, 'grace_reason' => null, 'updated_at' => now()]);

        $organization = Organization::query()->find($subscription->organization_id);

        if ($updated === 0 || $organization === null) {
            return;
        }

        Notification::send($organization->ownerUsers(), new SubscriptionExpiredNotification($organization));
    }
}
