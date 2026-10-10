<?php

declare(strict_types=1);

namespace App\Jobs\Subscriptions;

use App\Actions\Subscriptions\SyncSubscriptionAmountAction;
use App\Data\Subscriptions\SubscriptionAmountSyncData;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;

/**
 * Dispatched after a change that may move the count of active
 * professionals, so a membership change never waits on (or fails with)
 * the payment provider; the action is idempotent, so retries are safe.
 */
final class SyncSubscriptionAmountJob implements ShouldQueue
{
    use Dispatchable, Queueable;

    public int $tries = 5;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900, 3600];

    public function __construct(
        public readonly int $organizationId,
    ) {
        $this->afterCommit();
    }

    public function handle(SyncSubscriptionAmountAction $action): void
    {
        $action->handle(new SubscriptionAmountSyncData($this->organizationId));
    }
}
