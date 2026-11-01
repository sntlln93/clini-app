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
 * The adapter normalizes every provider status into SubscriptionStatus / SubscriptionPaymentOutcome.
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
     * Null when the provider says it doesn't exist (for these credentials): definitive, not a failure to retry.
     *
     * @throws SubscriptionGatewayUnavailableException on any other failure
     */
    public function fetchSubscription(string $id): ?ProviderSubscriptionData;

    /**
     * @throws SubscriptionGatewayUnavailableException
     */
    public function cancelSubscription(string $id): void;

    /**
     * Sets the amount of the subscription's next charges.
     *
     * @throws SubscriptionGatewayUnavailableException
     */
    public function updateSubscriptionAmount(string $id, int $amount, string $currency): void;

    /**
     * Null when the provider says it doesn't exist (for these credentials): definitive, not a failure to retry.
     *
     * @throws SubscriptionGatewayUnavailableException on any other failure
     */
    public function fetchPayment(string $id): ?ProviderPaymentData;

    public function verifyWebhookSignature(WebhookSignatureData $signature): bool;

    /**
     * Null for a notification type this domain doesn't act on.
     */
    public function notificationKind(string $type): ?SubscriptionNotificationKind;
}
