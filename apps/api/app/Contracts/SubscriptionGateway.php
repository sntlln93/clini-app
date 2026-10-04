<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Data\Subscriptions\ProviderPaymentData;
use App\Data\Subscriptions\ProviderSubscriptionData;
use App\Data\Subscriptions\SubscriptionSignupData;
use App\Data\Subscriptions\WebhookSignatureData;
use App\Enums\SubscriptionNotificationKind;
use App\Exceptions\Subscriptions\SubscriptionGatewayUnavailableException;

/**
 * Isolates the subscription domain from the payment provider wired in
 * (see `App\Services\Payments`): every provider status is normalized into
 * SubscriptionStatus / SubscriptionPaymentOutcome by the adapter.
 */
interface SubscriptionGateway
{
    /**
     * Identifier stored in `subscriptions.provider`.
     */
    public function provider(): string;

    /**
     * @throws SubscriptionGatewayUnavailableException
     */
    public function createSubscription(SubscriptionSignupData $signup): ProviderSubscriptionData;

    /**
     * @throws SubscriptionGatewayUnavailableException
     */
    public function fetchSubscription(string $id): ProviderSubscriptionData;

    /**
     * @throws SubscriptionGatewayUnavailableException
     */
    public function cancelSubscription(string $id): void;

    /**
     * @throws SubscriptionGatewayUnavailableException
     */
    public function fetchPayment(string $id): ProviderPaymentData;

    public function verifyWebhookSignature(WebhookSignatureData $signature): bool;

    /**
     * Null for a notification type this domain doesn't act on.
     */
    public function notificationKind(string $type): ?SubscriptionNotificationKind;
}
