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
 * Runs from the scheduler once a day (routes/console.php). Moves every
 * subscription whose grace period has ended unpaid to `expired` — which
 * makes the organization's agenda read-only — and notifies its owners.
 * A successful charge arriving later still reactivates it (webhook).
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
        // Conditional update: a payment webhook reactivating it meanwhile wins,
        // and so does a fresh grace period opened right after that (still
        // `grace`, but with a later grace_ends_at).
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
