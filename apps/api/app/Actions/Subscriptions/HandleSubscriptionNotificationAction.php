<?php

declare(strict_types=1);

namespace App\Actions\Subscriptions;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Contracts\SubscriptionGateway;
use App\Data\Subscriptions\ProviderPaymentData;
use App\Data\Subscriptions\ProviderSubscriptionData;
use App\Data\Subscriptions\SubscriptionNotificationData;
use App\Enums\SubscriptionGraceReason;
use App\Enums\SubscriptionNotificationKind;
use App\Enums\SubscriptionPaymentOutcome;
use App\Enums\SubscriptionStatus;
use App\Exceptions\Subscriptions\SubscriptionGatewayUnavailableException;
use App\Exceptions\Subscriptions\WebhookSignatureInvalidException;
use App\Models\Organization;
use App\Models\Subscription;
use App\Models\SubscriptionEvent;
use App\Notifications\Subscriptions\SubscriptionGraceStartedNotification;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * Applies one verified provider webhook notification to the local
 * subscription. Returns whether it was processed (false for a redelivered
 * notification already logged in `subscription_events`).
 *
 * The provider resource is fetched before the event is logged: a fetch
 * failure throws, nothing is logged, and the provider redelivers later. A
 * resource the provider reports as nonexistent (e.g. the dashboard's
 * "Simular notificación", which signs a fake id) is acknowledged without
 * being processed or logged as an event — retrying can't make it exist, and
 * leaving it unlogged keeps a later genuine delivery with the same
 * notification id processable.
 * Notifications for a subscription this app doesn't know (by
 * provider_subscription_id) are logged and otherwise ignored.
 *
 * @implements Action<SubscriptionNotificationData>
 */
final class HandleSubscriptionNotificationAction implements Action
{
    public function __construct(
        private readonly SubscriptionGateway $gateway,
    ) {}

    /**
     * @param  SubscriptionNotificationData  $dto
     */
    public function handle(Data $dto): bool
    {
        if (! $this->gateway->verifyWebhookSignature($dto->signature)) {
            throw new WebhookSignatureInvalidException($dto->signature->requestId);
        }

        $provider = $this->gateway->provider();
        $notificationId = $dto->notificationId
            ?? $dto->signature->requestId
            ?? ($dto->type ?? '').':'.($dto->resourceId ?? '');

        $alreadyLogged = SubscriptionEvent::query()
            ->where('provider', $provider)
            ->where('notification_id', $notificationId)
            ->exists();

        if ($alreadyLogged) {
            return false;
        }

        $kind = $dto->type !== null && $dto->resourceId !== null && $dto->resourceId !== ''
            ? $this->gateway->notificationKind($dto->type)
            : null;

        $resource = $kind !== null ? $this->resolveResource($kind, $dto->resourceId ?? '') : null;

        if ($kind !== null && $resource === null) {
            Log::warning('Subscription webhook resource not found at the provider; acknowledged without processing.', [
                'provider' => $provider,
                'notification_id' => $notificationId,
                'type' => $dto->type,
                'resource_id' => $dto->resourceId,
            ]);

            return false;
        }

        try {
            $graceStarted = DB::transaction(function () use ($dto, $provider, $notificationId, $resource): ?Subscription {
                $event = SubscriptionEvent::create([
                    'provider' => $provider,
                    'notification_id' => $notificationId,
                    'type' => $dto->type,
                    'resource_id' => $dto->resourceId,
                    'payload' => $dto->payload,
                ]);

                $subscription = $this->findSubscription($resource);

                if ($subscription === null) {
                    return null;
                }

                $event->update(['subscription_id' => $subscription->id]);

                return $this->apply($subscription, $resource);
            });
        } catch (UniqueConstraintViolationException) {
            // A concurrent delivery of the same notification won the insert.
            return false;
        }

        if ($graceStarted !== null) {
            $this->notifyGraceStarted($graceStarted);
        }

        return true;
    }

    /**
     * Null when the provider reports the resource doesn't exist.
     */
    private function resolveResource(SubscriptionNotificationKind $kind, string $resourceId): ProviderSubscriptionData|ProviderPaymentData|null
    {
        return match ($kind) {
            SubscriptionNotificationKind::Subscription => $this->gateway->fetchSubscription($resourceId),
            SubscriptionNotificationKind::Payment => $this->gateway->fetchPayment($resourceId),
        };
    }

    private function findSubscription(ProviderSubscriptionData|ProviderPaymentData|null $resource): ?Subscription
    {
        $providerId = match (true) {
            $resource instanceof ProviderSubscriptionData => $resource->id,
            $resource instanceof ProviderPaymentData => $resource->providerSubscriptionId,
            default => null,
        };

        if ($providerId === null) {
            return null;
        }

        return Subscription::withoutGlobalScope('organization')
            ->where('provider_subscription_id', $providerId)
            ->lockForUpdate()
            ->first();
    }

    /**
     * Returns the subscription when this notification opened its grace
     * period, so owners are notified once the transaction commits.
     */
    private function apply(Subscription $subscription, ProviderSubscriptionData|ProviderPaymentData|null $resource): ?Subscription
    {
        if ($resource instanceof ProviderSubscriptionData) {
            return $this->applySubscription($subscription, $resource);
        }

        if ($resource instanceof ProviderPaymentData) {
            return $this->applyPayment($subscription, $resource);
        }

        return null;
    }

    /**
     * A preapproval stays `authorized` while the provider retries a failed
     * charge, and its `updated` notifications also fire for non-payment
     * changes (a new card, the next payment date). So `authorized` only
     * confirms a pending checkout: leaving grace or expired is up to an
     * approved authorized_payment. A cancellation applies from any status.
     *
     * A cancelled local row is also confirmed by `authorized`: the resource
     * is fetched fresh from the provider and a cancelled preapproval never
     * goes back to authorized, so an authorized one reaching a cancelled row
     * is the replacement preapproval created by re-subscribing.
     *
     * A paused preapproval stops charging, so no failed charge would ever
     * open grace for it: pausing an active subscription opens the grace
     * period itself, exactly like a failed charge (and, like one, never
     * extends an ongoing grace period). Resuming it does lift that grace:
     * the provider doesn't charge again until the next billing date (usually
     * past the grace period), so waiting for an approved charge would expire
     * an org whose preapproval is authorized again. Only a pause-opened grace
     * is lifted this way; a failed charge's grace still needs an approved one.
     *
     * Every applied preapproval also refreshes the next charge date, whatever
     * the transition (a cancelled one has no next charge).
     *
     * `cancelled_at` records when the row was first cancelled: a repeated
     * cancellation keeps it, and reactivating the row clears it.
     */
    private function applySubscription(Subscription $subscription, ProviderSubscriptionData $resource): ?Subscription
    {
        $subscription->next_payment_at = $resource->status === SubscriptionStatus::Cancelled ? null : $resource->nextPaymentAt;

        if ($resource->status === SubscriptionStatus::Cancelled) {
            $subscription->update([
                'status' => SubscriptionStatus::Cancelled,
                'grace_ends_at' => null,
                'grace_reason' => null,
                'cancelled_at' => $subscription->status === SubscriptionStatus::Cancelled
                    ? ($subscription->cancelled_at ?? CarbonImmutable::now())
                    : CarbonImmutable::now(),
            ]);

            return null;
        }

        if ($resource->paused) {
            return $this->enterGrace($subscription, SubscriptionGraceReason::Paused) ? $subscription : null;
        }

        $resumed = $subscription->status === SubscriptionStatus::Grace
            && $subscription->grace_reason === SubscriptionGraceReason::Paused;
        $confirmable = $resumed
            || in_array($subscription->status, [SubscriptionStatus::Pending, SubscriptionStatus::Cancelled], true);

        if ($resource->status === SubscriptionStatus::Active && $confirmable) {
            $subscription->update([
                'status' => SubscriptionStatus::Active,
                'grace_ends_at' => null,
                'grace_reason' => null,
                'cancelled_at' => null,
            ]);

            return null;
        }

        $subscription->save();

        return null;
    }

    /**
     * Charges can be (re)delivered out of order, and an older charge's
     * outcome is final, so a stale one must not override a newer one: an
     * approved charge older than the last recorded failure, or a failed one
     * not newer than the last recorded payment, is ignored. The comparison
     * uses the charge's own billing date (same across its retries), so a
     * retry of a failed charge that is later approved still applies, and a
     * late failure of a charge that was eventually approved does not.
     */
    private function applyPayment(Subscription $subscription, ProviderPaymentData $resource): ?Subscription
    {
        $chargedAt = $resource->chargedAt ?? CarbonImmutable::now();
        /** @var CarbonImmutable|null $lastPaymentAt */
        $lastPaymentAt = $subscription->last_payment_at;
        /** @var CarbonImmutable|null $lastFailedAt */
        $lastFailedAt = $subscription->last_payment_failed_at;

        if ($resource->outcome === SubscriptionPaymentOutcome::Approved) {
            if ($lastFailedAt !== null && $chargedAt->lessThan($lastFailedAt)) {
                return null;
            }

            // A cancellation is final for its preapproval: a late (re)delivery
            // of an earlier approved charge never revives it. A cancelled row
            // whose provider_subscription_id was replaced by re-subscribing
            // points at a live preapproval instead, so its approved charge
            // does activate it — the provider's current preapproval status
            // tells the two apart.
            if ($subscription->status === SubscriptionStatus::Cancelled) {
                $preapproval = $this->chargedPreapproval($resource);

                if ($preapproval === null || $preapproval->status === SubscriptionStatus::Cancelled) {
                    return null;
                }
            } else {
                $preapproval = $this->chargedPreapprovalForRenewalDate($resource);
            }

            $subscription->update([
                'status' => SubscriptionStatus::Active,
                'grace_ends_at' => null,
                'grace_reason' => null,
                'cancelled_at' => null,
                'last_payment_at' => $lastPaymentAt !== null && $lastPaymentAt->greaterThan($chargedAt) ? $lastPaymentAt : $chargedAt,
                'next_payment_at' => $preapproval->nextPaymentAt ?? $subscription->next_payment_at,
            ]);

            return null;
        }

        if ($resource->outcome !== SubscriptionPaymentOutcome::Failed) {
            return null;
        }

        if ($lastPaymentAt !== null && $chargedAt->lessThanOrEqualTo($lastPaymentAt)) {
            return null;
        }

        $subscription->last_payment_failed_at = $lastFailedAt !== null && $lastFailedAt->greaterThan($chargedAt) ? $lastFailedAt : $chargedAt;

        // A charge failing during a pause-opened grace (e.g. right after a
        // resume) makes it a payment grace: resuming no longer lifts it.
        if ($subscription->status === SubscriptionStatus::Grace) {
            $subscription->grace_reason = SubscriptionGraceReason::PaymentFailed;
        }

        return $this->enterGrace($subscription, SubscriptionGraceReason::PaymentFailed) ? $subscription : null;
    }

    /**
     * Only an active subscription enters grace: an ongoing grace period is
     * never extended. Saves the row (with any pending change) either way and
     * returns whether grace was opened.
     */
    private function enterGrace(Subscription $subscription, SubscriptionGraceReason $reason): bool
    {
        $entersGrace = $subscription->status === SubscriptionStatus::Active;

        if ($entersGrace) {
            $subscription->status = SubscriptionStatus::Grace;
            $subscription->grace_ends_at = CarbonImmutable::now()->addDays(Subscription::GRACE_DAYS);
            $subscription->grace_reason = $reason;
        }

        $subscription->save();

        return $entersGrace;
    }

    /**
     * The preapproval a charge belongs to, fetched fresh. Null for a charge
     * with no preapproval or one the provider no longer finds — neither can
     * revive a cancelled row. A provider outage throws, so the notification
     * is redelivered.
     */
    private function chargedPreapproval(ProviderPaymentData $resource): ?ProviderSubscriptionData
    {
        if ($resource->providerSubscriptionId === null) {
            return null;
        }

        return $this->gateway->fetchSubscription($resource->providerSubscriptionId);
    }

    /**
     * Same lookup, made only to refresh the displayed renewal date: an
     * approved charge activates the row regardless, so a provider outage
     * here keeps the stored date instead of failing the notification.
     */
    private function chargedPreapprovalForRenewalDate(ProviderPaymentData $resource): ?ProviderSubscriptionData
    {
        try {
            return $this->chargedPreapproval($resource);
        } catch (SubscriptionGatewayUnavailableException $exception) {
            Log::warning('Could not refresh the next payment date after an approved charge.', [
                'payment_id' => $resource->id,
                ...$exception->logContext(),
            ]);

            return null;
        }
    }

    private function notifyGraceStarted(Subscription $subscription): void
    {
        $organization = Organization::query()->find($subscription->organization_id);
        /** @var CarbonImmutable $graceEndsAt */
        $graceEndsAt = $subscription->grace_ends_at;

        if ($organization === null) {
            return;
        }

        Notification::send(
            $organization->ownerUsers(),
            new SubscriptionGraceStartedNotification($organization, $graceEndsAt),
        );
    }
}
