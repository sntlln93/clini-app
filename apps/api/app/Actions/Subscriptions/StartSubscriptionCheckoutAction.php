<?php

declare(strict_types=1);

namespace App\Actions\Subscriptions;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Contracts\SubscriptionGateway;
use App\Data\Subscriptions\ProviderSubscriptionData;
use App\Data\Subscriptions\SubscriptionCheckoutData;
use App\Data\Subscriptions\SubscriptionSignupData;
use App\Enums\SubscriptionStatus;
use App\Exceptions\Subscriptions\SubscriptionAlreadyActiveException;
use App\Exceptions\Subscriptions\SubscriptionGatewayUnavailableException;
use App\Models\Organization;
use App\Models\Subscription;
use Illuminate\Support\Facades\DB;

/**
 * Returns the provider checkout URL the owner is redirected to.
 *
 * A pending or in-grace subscription reuses its existing provider
 * subscription (so regularizing a payment never creates a second one that
 * would charge twice) — unless it is paused, since a paused one no longer
 * charges; otherwise a new one is created and stored, and only then is the
 * previous provider subscription cancelled if it can still charge (an
 * expired org's preapproval is usually still being retried by the provider).
 * Should that cancellation fail, the transaction rolls back to the old
 * preapproval, leaving the just-created one unpaid and never authorized. The local
 * status is never lifted here — only a verified webhook moves it to
 * active — so an expired organization stays read-only until the provider
 * confirms. That includes a cancelled one: it keeps its status (and stays
 * read-only) with the replacement preapproval stored, and the webhook lifts
 * it once that preapproval is authorized or charged.
 *
 * Runs under a lock on the organization row so two concurrent checkout
 * starts (two owners, two tabs) can't both create a provider subscription
 * and orphan one of them; the row's subscription is re-read under that lock.
 *
 * @implements Action<SubscriptionCheckoutData>
 */
final class StartSubscriptionCheckoutAction implements Action
{
    public function __construct(
        private readonly SubscriptionGateway $gateway,
    ) {}

    /**
     * @param  SubscriptionCheckoutData  $dto
     */
    public function handle(Data $dto): string
    {
        return DB::transaction(function () use ($dto): string {
            $organization = Organization::query()->lockForUpdate()->findOrFail($dto->organizationId);

            $subscription = Subscription::withoutGlobalScope('organization')
                ->where('organization_id', $organization->id)
                ->lockForUpdate()
                ->first();

            /** @var SubscriptionStatus|null $status */
            $status = $subscription?->status;

            if ($status === SubscriptionStatus::Active) {
                throw new SubscriptionAlreadyActiveException($organization->id);
            }

            $previous = $this->previousProviderSubscription($subscription);
            $live = $previous !== null && $previous->status !== SubscriptionStatus::Cancelled ? $previous : null;

            if ($live !== null) {
                $reusable = in_array($status, [SubscriptionStatus::Pending, SubscriptionStatus::Grace], true)
                    && ! $live->paused
                    && $live->initPoint !== null;

                if ($reusable) {
                    return $live->initPoint;
                }
            }

            $created = $this->gateway->createSubscription(new SubscriptionSignupData(
                externalReference: (string) $organization->id,
                payerEmail: $dto->payerEmail,
                reason: 'Suscripción Clini — '.$organization->name,
            ));

            if ($created->initPoint === null) {
                throw new SubscriptionGatewayUnavailableException('/preapproval');
            }

            Subscription::withoutGlobalScope('organization')->updateOrCreate(
                ['organization_id' => $organization->id],
                [
                    'provider' => $this->gateway->provider(),
                    'provider_subscription_id' => $created->id,
                    'status' => $status ?? SubscriptionStatus::Pending,
                ],
            );

            // Only once the replacement exists and the row points at it: a
            // failed create must leave the old preapproval live, and the
            // provider's `cancelled` webhook for it (blocked on this row's
            // lock until commit) then finds no row to cancel.
            if ($live !== null) {
                $this->gateway->cancelSubscription($live->id);
            }

            return $created->initPoint;
        });
    }

    private function previousProviderSubscription(?Subscription $subscription): ?ProviderSubscriptionData
    {
        $providerId = $subscription?->provider_subscription_id;

        return $providerId !== null ? $this->gateway->fetchSubscription($providerId) : null;
    }
}
