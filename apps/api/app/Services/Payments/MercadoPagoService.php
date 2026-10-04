<?php

declare(strict_types=1);

namespace App\Services\Payments;

use App\Contracts\SubscriptionGateway;
use App\Data\Subscriptions\ProviderPaymentData;
use App\Data\Subscriptions\ProviderSubscriptionData;
use App\Data\Subscriptions\SubscriptionSignupData;
use App\Data\Subscriptions\WebhookSignatureData;
use App\Enums\SubscriptionNotificationKind;
use App\Enums\SubscriptionPaymentOutcome;
use App\Enums\SubscriptionStatus;
use App\Exceptions\Subscriptions\SubscriptionGatewayUnavailableException;
use App\Models\Subscription;
use Carbon\CarbonImmutable;
use Carbon\Exceptions\InvalidFormatException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Adapter for Mercado Pago's subscriptions REST API: `/preapproval` for
 * recurring subscriptions and `/authorized_payments` for each of their
 * charges. Isolates its raw JSON shape and status vocabulary behind
 * `SubscriptionGateway`. No SDK: plain Http client calls.
 *
 * Only the GET lookups (`fetchSubscription`, `fetchPayment`) treat a 404 as
 * "the resource doesn't exist for these credentials" and return null; every
 * other failure — and any failure of a POST/PUT — throws
 * SubscriptionGatewayUnavailableException.
 */
final class MercadoPagoService implements SubscriptionGateway
{
    public const BASE_URL = 'https://api.mercadopago.com';

    private const TIMEOUT_SECONDS = 10;

    private const ERROR_REASON_LIMIT = 500;

    public function provider(): string
    {
        return Subscription::PROVIDER_MERCADOPAGO;
    }

    public function createSubscription(SubscriptionSignupData $signup): ProviderSubscriptionData
    {
        $endpoint = '/preapproval';

        $response = $this->send($endpoint, fn (PendingRequest $request): Response => $request->post(self::BASE_URL.$endpoint, [
            'reason' => $signup->reason,
            'external_reference' => $signup->externalReference,
            'payer_email' => $signup->payerEmail,
            'auto_recurring' => [
                'frequency' => 1,
                'frequency_type' => 'months',
                'transaction_amount' => $this->planAmount(),
                'currency_id' => $this->configString('plan_currency', 'ARS'),
            ],
            'back_url' => $this->configString('back_url'),
            'status' => 'pending',
        ]));

        return $this->toSubscription($endpoint, $response);
    }

    public function fetchSubscription(string $id): ?ProviderSubscriptionData
    {
        $endpoint = '/preapproval/'.rawurlencode($id);

        $response = $this->lookup($endpoint);

        return $response !== null ? $this->toSubscription($endpoint, $response) : null;
    }

    public function cancelSubscription(string $id): void
    {
        $endpoint = '/preapproval/'.rawurlencode($id);

        $this->send($endpoint, fn (PendingRequest $request): Response => $request->put(self::BASE_URL.$endpoint, [
            'status' => 'cancelled',
        ]));
    }

    public function fetchPayment(string $id): ?ProviderPaymentData
    {
        $endpoint = '/authorized_payments/'.rawurlencode($id);

        $response = $this->lookup($endpoint);

        if ($response === null) {
            return null;
        }

        $payload = $response->json();

        if (! is_array($payload) || ! isset($payload['id'])) {
            throw new SubscriptionGatewayUnavailableException($endpoint, $response->status());
        }

        $preapprovalId = $payload['preapproval_id'] ?? null;

        return new ProviderPaymentData(
            id: $this->scalarString($payload['id']),
            providerSubscriptionId: $preapprovalId !== null ? $this->scalarString($preapprovalId) : null,
            outcome: $this->paymentOutcome($payload),
            chargedAt: $this->chargeDate($payload),
        );
    }

    /**
     * Mercado Pago's documented scheme: `x-signature` carries `ts=<ts>,v1=<hash>`,
     * where `<hash>` is HMAC-SHA256, keyed by the webhook secret, over the
     * manifest `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` — a part
     * whose value is absent is dropped from the manifest, and an
     * alphanumeric `data.id` is signed lowercased.
     */
    public function verifyWebhookSignature(WebhookSignatureData $signature): bool
    {
        $secret = $this->configString('webhook_secret');

        if ($secret === '' || $signature->signature === null || $signature->signature === '') {
            return false;
        }

        $parts = [];

        foreach (explode(',', $signature->signature) as $pair) {
            [$key, $value] = array_pad(explode('=', $pair, 2), 2, '');
            $parts[trim($key)] = trim($value);
        }

        $ts = $parts['ts'] ?? '';
        $hash = $parts['v1'] ?? '';

        if ($ts === '' || $hash === '') {
            return false;
        }

        $manifest = '';

        if ($signature->resourceId !== null && $signature->resourceId !== '') {
            $manifest .= 'id:'.strtolower($signature->resourceId).';';
        }

        if ($signature->requestId !== null && $signature->requestId !== '') {
            $manifest .= 'request-id:'.$signature->requestId.';';
        }

        $manifest .= 'ts:'.$ts.';';

        return hash_equals(hash_hmac('sha256', $manifest, $secret), $hash);
    }

    public function notificationKind(string $type): ?SubscriptionNotificationKind
    {
        return match ($type) {
            'subscription_preapproval', 'preapproval' => SubscriptionNotificationKind::Subscription,
            'subscription_authorized_payment', 'authorized_payment' => SubscriptionNotificationKind::Payment,
            default => null,
        };
    }

    /**
     * GETs a resource; null when the provider answers 404 (the resource
     * doesn't exist for these credentials — retrying won't change that).
     */
    private function lookup(string $endpoint): ?Response
    {
        $response = $this->dispatch($endpoint, fn (PendingRequest $request): Response => $request->get(self::BASE_URL.$endpoint));

        if ($response->notFound()) {
            Log::warning('Payment provider resource not found.', [
                'endpoint' => $endpoint,
                'provider_status' => $response->status(),
            ]);

            return null;
        }

        return $this->ensureSuccessful($endpoint, $response);
    }

    /**
     * @param  callable(PendingRequest): Response  $call
     */
    private function send(string $endpoint, callable $call): Response
    {
        return $this->ensureSuccessful($endpoint, $this->dispatch($endpoint, $call));
    }

    /**
     * @param  callable(PendingRequest): Response  $call
     */
    private function dispatch(string $endpoint, callable $call): Response
    {
        $request = Http::withToken($this->configString('access_token'))
            ->acceptJson()
            ->asJson()
            ->timeout(self::TIMEOUT_SECONDS);

        try {
            return $call($request);
        } catch (ConnectionException $exception) {
            throw new SubscriptionGatewayUnavailableException($endpoint, previous: $exception);
        }
    }

    private function ensureSuccessful(string $endpoint, Response $response): Response
    {
        if ($response->failed()) {
            throw new SubscriptionGatewayUnavailableException($endpoint, $response->status(), providerMessage: $this->errorReason($response));
        }

        return $response;
    }

    /**
     * Mercado Pago's error body carries `message`, `error` and a `cause` list
     * of `{code, description}`; joined and capped so a large body can't flood
     * the log. Falls back to the raw body when it isn't JSON.
     */
    private function errorReason(Response $response): ?string
    {
        $payload = $response->json();

        if (! is_array($payload)) {
            $body = trim($response->body());

            return $body !== '' ? Str::limit($body, self::ERROR_REASON_LIMIT) : null;
        }

        $parts = array_filter([
            is_string($payload['message'] ?? null) ? $payload['message'] : null,
            is_string($payload['error'] ?? null) ? $payload['error'] : null,
        ]);

        foreach (is_array($payload['cause'] ?? null) ? $payload['cause'] : [] as $cause) {
            if (is_array($cause) && is_string($cause['description'] ?? null)) {
                $parts[] = $cause['description'];
            }
        }

        return $parts !== [] ? Str::limit(implode(' | ', $parts), self::ERROR_REASON_LIMIT) : null;
    }

    private function toSubscription(string $endpoint, Response $response): ProviderSubscriptionData
    {
        $payload = $response->json();

        if (! is_array($payload) || ! isset($payload['id'])) {
            throw new SubscriptionGatewayUnavailableException($endpoint, $response->status());
        }

        $initPoint = $payload['init_point'] ?? null;

        return new ProviderSubscriptionData(
            id: $this->scalarString($payload['id']),
            status: $this->subscriptionStatus($payload['status'] ?? null),
            initPoint: is_string($initPoint) ? $initPoint : null,
            paused: ($payload['status'] ?? null) === 'paused',
        );
    }

    private function subscriptionStatus(mixed $status): ?SubscriptionStatus
    {
        return match ($status) {
            'authorized' => SubscriptionStatus::Active,
            'cancelled' => SubscriptionStatus::Cancelled,
            'pending' => SubscriptionStatus::Pending,
            default => null,
        };
    }

    /**
     * `payment.status` is the charge's own result; a top-level `recycling`
     * status means Mercado Pago is retrying a charge that already failed.
     *
     * @param  array<mixed>  $payload
     */
    private function paymentOutcome(array $payload): ?SubscriptionPaymentOutcome
    {
        $payment = $payload['payment'] ?? null;
        $paymentStatus = is_array($payment) ? ($payment['status'] ?? null) : null;

        if ($paymentStatus === 'approved') {
            return SubscriptionPaymentOutcome::Approved;
        }

        if (in_array($paymentStatus, ['rejected', 'cancelled'], true) || ($payload['status'] ?? null) === 'recycling') {
            return SubscriptionPaymentOutcome::Failed;
        }

        return null;
    }

    /**
     * `debit_date` is the charge's scheduled debit date and `date_created`
     * its creation; both identify the billing period and stay the same
     * across the provider's retries of that charge. Normalized to the app
     * timezone, which is how the datetime columns are stored.
     *
     * @param  array<mixed>  $payload
     */
    private function chargeDate(array $payload): ?CarbonImmutable
    {
        $raw = $payload['debit_date'] ?? $payload['date_created'] ?? null;

        if (! is_string($raw) || $raw === '') {
            return null;
        }

        try {
            return CarbonImmutable::parse($raw)->setTimezone(date_default_timezone_get());
        } catch (InvalidFormatException) {
            return null;
        }
    }

    private function planAmount(): int
    {
        $amount = Config::get('services.mercadopago.plan_amount');

        return is_numeric($amount) ? (int) $amount : 0;
    }

    private function configString(string $key, string $default = ''): string
    {
        $value = Config::get('services.mercadopago.'.$key);

        return is_string($value) && $value !== '' ? $value : $default;
    }

    private function scalarString(mixed $value): string
    {
        return is_scalar($value) ? (string) $value : '';
    }
}
