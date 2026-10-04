<?php

declare(strict_types=1);

use App\Data\Subscriptions\SubscriptionSignupData;
use App\Data\Subscriptions\WebhookSignatureData;
use App\Enums\SubscriptionNotificationKind;
use App\Enums\SubscriptionPaymentOutcome;
use App\Enums\SubscriptionStatus;
use App\Exceptions\Subscriptions\SubscriptionGatewayUnavailableException;
use App\Services\Payments\MercadoPagoService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    configureMercadoPago();
    Http::preventStrayRequests();
});

test('createSubscription posts a monthly preapproval with the configured plan and returns its init_point', function () {
    Http::fake([
        'api.mercadopago.com/preapproval' => Http::response([
            'id' => 'pre-123',
            'status' => 'pending',
            'init_point' => 'https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=pre-123',
        ], 201),
    ]);

    $created = app(MercadoPagoService::class)->createSubscription(new SubscriptionSignupData(
        externalReference: '42',
        payerEmail: 'duena@example.com',
        reason: 'Suscripción Clini — Consultorio Uno',
    ));

    expect($created->id)->toBe('pre-123');
    expect($created->status)->toBe(SubscriptionStatus::Pending);
    expect($created->initPoint)->toBe('https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=pre-123');

    Http::assertSent(fn (Request $request): bool => $request->method() === 'POST'
        && $request->url() === 'https://api.mercadopago.com/preapproval'
        && $request->hasHeader('Authorization', 'Bearer TEST-access-token')
        && $request['reason'] === 'Suscripción Clini — Consultorio Uno'
        && $request['external_reference'] === '42'
        && $request['payer_email'] === 'duena@example.com'
        && $request['back_url'] === 'https://panel.example.com/ajustes'
        && $request['status'] === 'pending'
        && $request['auto_recurring'] === [
            'frequency' => 1,
            'frequency_type' => 'months',
            'transaction_amount' => 15000,
            'currency_id' => 'ARS',
        ]);
});

test('fetchSubscription maps the preapproval status into the domain vocabulary', function (string $raw, ?SubscriptionStatus $expected, bool $paused) {
    Http::fake([
        'api.mercadopago.com/preapproval/pre-1' => Http::response(['id' => 'pre-1', 'status' => $raw]),
    ]);

    $subscription = app(MercadoPagoService::class)->fetchSubscription('pre-1');

    expect($subscription->status)->toBe($expected);
    expect($subscription->paused)->toBe($paused);
})->with([
    'authorized' => ['authorized', SubscriptionStatus::Active, false],
    'cancelled' => ['cancelled', SubscriptionStatus::Cancelled, false],
    'pending' => ['pending', SubscriptionStatus::Pending, false],
    'paused' => ['paused', null, true],
]);

test('cancelSubscription puts the preapproval in cancelled status', function () {
    Http::fake([
        'api.mercadopago.com/preapproval/pre-1' => Http::response(['id' => 'pre-1', 'status' => 'cancelled']),
    ]);

    app(MercadoPagoService::class)->cancelSubscription('pre-1');

    Http::assertSent(fn (Request $request): bool => $request->method() === 'PUT'
        && $request->url() === 'https://api.mercadopago.com/preapproval/pre-1'
        && $request->hasHeader('Authorization', 'Bearer TEST-access-token')
        && $request['status'] === 'cancelled');
});

test('fetchPayment maps the authorized payment into an outcome and its preapproval', function (array $payload, ?SubscriptionPaymentOutcome $expected) {
    Http::fake([
        'api.mercadopago.com/authorized_payments/7001' => Http::response(array_merge(['id' => 7001, 'preapproval_id' => 'pre-1'], $payload)),
    ]);

    $payment = app(MercadoPagoService::class)->fetchPayment('7001');

    expect($payment->id)->toBe('7001');
    expect($payment->providerSubscriptionId)->toBe('pre-1');
    expect($payment->outcome)->toBe($expected);
})->with([
    'approved' => [['status' => 'processed', 'payment' => ['status' => 'approved']], SubscriptionPaymentOutcome::Approved],
    'rejected' => [['status' => 'processed', 'payment' => ['status' => 'rejected']], SubscriptionPaymentOutcome::Failed],
    'recycling' => [['status' => 'recycling', 'payment' => ['status' => 'pending']], SubscriptionPaymentOutcome::Failed],
    'scheduled' => [['status' => 'scheduled'], null],
]);

test('fetchPayment reads the charge date from debit_date, falling back to date_created', function (array $payload, ?string $expected) {
    Http::fake([
        'api.mercadopago.com/authorized_payments/7001' => Http::response(array_merge(['id' => 7001, 'preapproval_id' => 'pre-1'], $payload)),
    ]);

    expect(app(MercadoPagoService::class)->fetchPayment('7001')->chargedAt?->toDateTimeString())->toBe($expected);
})->with([
    'debit_date' => [['debit_date' => '2026-09-01T10:00:00.000-03:00', 'date_created' => '2026-08-30T10:00:00.000-03:00'], '2026-09-01 13:00:00'],
    'date_created' => [['date_created' => '2026-08-30T10:00:00.000-03:00'], '2026-08-30 13:00:00'],
    'none' => [[], null],
    'unparseable' => [['debit_date' => 'not a date'], null],
]);

test('a non-2xx provider response throws SubscriptionGatewayUnavailableException', function () {
    Http::fake([
        'api.mercadopago.com/preapproval/pre-1' => Http::response(['message' => 'boom'], 500),
    ]);

    app(MercadoPagoService::class)->fetchSubscription('pre-1');
})->throws(SubscriptionGatewayUnavailableException::class);

test('a payload without an id throws SubscriptionGatewayUnavailableException', function () {
    Http::fake([
        'api.mercadopago.com/preapproval/pre-1' => Http::response(['status' => 'authorized']),
    ]);

    app(MercadoPagoService::class)->fetchSubscription('pre-1');
})->throws(SubscriptionGatewayUnavailableException::class);

test('notificationKind classifies the subscription notification types', function () {
    $service = app(MercadoPagoService::class);

    expect($service->notificationKind('subscription_preapproval'))->toBe(SubscriptionNotificationKind::Subscription);
    expect($service->notificationKind('subscription_authorized_payment'))->toBe(SubscriptionNotificationKind::Payment);
    expect($service->notificationKind('payment'))->toBeNull();
});

test('a signature computed with the webhook secret over the documented manifest is valid', function () {
    $header = mercadoPagoSignature('ABC123', 'req-1', '1704908010');

    expect(app(MercadoPagoService::class)->verifyWebhookSignature(
        new WebhookSignatureData($header, 'req-1', 'ABC123'),
    ))->toBeTrue();
});

test('a signature computed with another secret is rejected', function () {
    $header = mercadoPagoSignature('abc123', 'req-1', '1704908010', 'another-secret');

    expect(app(MercadoPagoService::class)->verifyWebhookSignature(
        new WebhookSignatureData($header, 'req-1', 'abc123'),
    ))->toBeFalse();
});

test('a missing signature header is rejected', function () {
    expect(app(MercadoPagoService::class)->verifyWebhookSignature(
        new WebhookSignatureData(null, 'req-1', 'abc123'),
    ))->toBeFalse();
});

test('a tampered ts is rejected', function () {
    $header = mercadoPagoSignature('abc123', 'req-1', '1704908010');
    $tampered = str_replace('ts=1704908010', 'ts=1704908999', $header);

    expect(app(MercadoPagoService::class)->verifyWebhookSignature(
        new WebhookSignatureData($tampered, 'req-1', 'abc123'),
    ))->toBeFalse();
});

test('a signature for another request id is rejected', function () {
    $header = mercadoPagoSignature('abc123', 'req-1', '1704908010');

    expect(app(MercadoPagoService::class)->verifyWebhookSignature(
        new WebhookSignatureData($header, 'req-2', 'abc123'),
    ))->toBeFalse();
});

test('every signature is rejected while no webhook secret is configured', function () {
    $header = mercadoPagoSignature('abc123', 'req-1', '1704908010');
    config(['services.mercadopago.webhook_secret' => null]);

    expect(app(MercadoPagoService::class)->verifyWebhookSignature(
        new WebhookSignatureData($header, 'req-1', 'abc123'),
    ))->toBeFalse();
});
