<?php

declare(strict_types=1);

namespace App\Actions\Subscriptions;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Contracts\SubscriptionGateway;
use App\Data\Subscriptions\ProviderSubscriptionData;
use App\Data\Subscriptions\SubscriptionCancellationData;
use App\Enums\SubscriptionStatus;
use App\Exceptions\Subscriptions\SubscriptionGatewayUnavailableException;
use App\Exceptions\Subscriptions\SubscriptionNotCancellableException;
use App\Models\Organization;
use App\Models\Subscription;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Cancels the organization's provider subscription, then the local row.
 *
 * Only a subscription that can still charge is cancellable: active, in
 * grace, or expired (the provider usually keeps retrying an expired one's
 * charge). The provider is called first, inside the transaction: if it
 * fails nothing local changes. A preapproval the provider already reports
 * cancelled (cancelled from Mercado Pago, its webhook not here yet) is not
 * cancelled again; one it no longer finds is refused, like checkout does.
 *
 * An active subscription keeps write access until the end of the period it
 * already paid for (`access_ends_at`); a grace or expired one is unpaid,
 * so it becomes read-only right away. The provider's `cancelled` webhook
 * that follows finds the row already cancelled and keeps both dates.
 *
 * Locks the organization row, then its subscription — the same order as
 * StartSubscriptionCheckoutAction, so the two serialize.
 *
 * @implements Action<SubscriptionCancellationData>
 */
final class CancelSubscriptionAction implements Action
{
    private const CANCELLABLE = [SubscriptionStatus::Active, SubscriptionStatus::Grace, SubscriptionStatus::Expired];

    public function __construct(
        private readonly SubscriptionGateway $gateway,
    ) {}

    /**
     * @param  SubscriptionCancellationData  $dto
     */
    public function handle(Data $dto): Subscription
    {
        return DB::transaction(function () use ($dto): Subscription {
            $organization = Organization::query()->lockForUpdate()->findOrFail($dto->organizationId);

            $subscription = Subscription::withoutGlobalScope('organization')
                ->where('organization_id', $organization->id)
                ->lockForUpdate()
                ->first();

            /** @var SubscriptionStatus|null $status */
            $status = $subscription?->status;

            if ($subscription === null || ! in_array($status, self::CANCELLABLE, true)) {
                throw new SubscriptionNotCancellableException($organization->id, $status);
            }

            $remote = $this->cancelAtProvider($subscription->provider_subscription_id);

            $subscription->update([
                'status' => SubscriptionStatus::Cancelled,
                'grace_ends_at' => null,
                'grace_reason' => null,
                'cancelled_at' => CarbonImmutable::now(),
                'access_ends_at' => $subscription->paidThrough($remote?->nextPaymentAt),
                'next_payment_at' => null,
            ]);

            return $subscription;
        });
    }

    /**
     * Returns the preapproval as fetched before cancelling it, whose next
     * charge date is fresher than the stored one.
     */
    private function cancelAtProvider(?string $providerId): ?ProviderSubscriptionData
    {
        if ($providerId === null) {
            return null;
        }

        $remote = $this->gateway->fetchSubscription($providerId)
            ?? throw new SubscriptionGatewayUnavailableException('/preapproval/'.rawurlencode($providerId), 404);

        if ($remote->status !== SubscriptionStatus::Cancelled) {
            $this->gateway->cancelSubscription($providerId);
        }

        return $remote;
    }
}
