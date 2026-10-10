<?php

declare(strict_types=1);

namespace App\Actions\Subscriptions;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Contracts\SubscriptionGateway;
use App\Data\Subscriptions\SubscriptionAmountSyncData;
use App\Enums\SubscriptionStatus;
use App\Models\Organization;
use App\Models\Subscription;
use App\Support\OrganizationPlan;
use App\Support\PracticePricing;
use Illuminate\Support\Facades\DB;

/**
 * Brings the provider subscription's amount in line with the organization's
 * active professionals (PracticePricing), from its next charge on, with no
 * proration (ADR 0014). Recomputed from the current state on every run, so
 * a retry or a late duplicate never applies a stale amount; a provider
 * failure throws before the stored amount changes, for the job to retry.
 *
 * Skips a subscription that can't charge anymore (cancelled, or with no
 * provider subscription) and an organization on an assigned plan. Locks the
 * organization row, then its subscription, like checkout and cancellation.
 *
 * @implements Action<SubscriptionAmountSyncData>
 */
final class SyncSubscriptionAmountAction implements Action
{
    public function __construct(
        private readonly SubscriptionGateway $gateway,
        private readonly OrganizationPlan $plans,
        private readonly PracticePricing $pricing,
    ) {}

    /**
     * @param  SubscriptionAmountSyncData  $dto
     */
    public function handle(Data $dto): ?Subscription
    {
        return DB::transaction(function () use ($dto): ?Subscription {
            $organization = Organization::query()->lockForUpdate()->find($dto->organizationId);

            $subscription = Subscription::withoutGlobalScope('organization')
                ->where('organization_id', $dto->organizationId)
                ->lockForUpdate()
                ->first();

            $providerId = $subscription?->provider_subscription_id;

            if ($organization === null || $organization->assigned_plan !== null
                || $subscription === null || $providerId === null
                || $subscription->status === SubscriptionStatus::Cancelled) {
                return $subscription;
            }

            $amount = $this->pricing->monthlyAmount($this->plans->activeProfessionals($organization->id));

            if ($subscription->amount !== $amount) {
                $this->gateway->updateSubscriptionAmount($providerId, $amount, $this->pricing->currency());
                $subscription->update(['amount' => $amount]);
            }

            return $subscription;
        });
    }
}
