<?php

declare(strict_types=1);

use App\Contracts\InvoiceIssuer;
use App\Enums\InvoiceEnvironment;
use App\Enums\InvoiceStatus;
use App\Enums\MembershipRole;
use App\Enums\SubscriptionStatus;
use App\Jobs\Invoices\IssueInvoiceJob;
use App\Models\Invoice;
use App\Models\Membership;
use App\Models\Subscription;
use App\Notifications\Invoices\InvoiceIssuedNotification;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Testing\TestResponse;

beforeEach(function () {
    configureMercadoPago();
    Http::preventStrayRequests();
    Notification::fake();
    Date::setTestNow('2026-10-03 13:00:00');
});

afterEach(function () {
    Date::setTestNow();
});

/**
 * A signed `subscription_authorized_payment` notification, as Mercado Pago
 * sends one (#246).
 */
function postChargeNotification(string $paymentId, string $notificationId): TestResponse
{
    $requestId = 'req-'.$notificationId;

    return test()->postJson(
        "/api/v1/webhooks/mercadopago?data.id={$paymentId}&type=subscription_authorized_payment",
        ['id' => $notificationId, 'type' => 'subscription_authorized_payment', 'action' => 'updated', 'data' => ['id' => $paymentId]],
        ['x-signature' => mercadoPagoSignature($paymentId, $requestId, '1704908010'), 'x-request-id' => $requestId],
    );
}

/**
 * Mercado Pago's authorized payment `$id` of preapproval `pre-1`, and the
 * preapproval itself (an approved charge refreshes its next payment date).
 *
 * @param  array<string, mixed>  $overrides
 */
function fakeCharge(string $id, string $status = 'approved', array $overrides = []): void
{
    Http::fake([
        "api.mercadopago.com/authorized_payments/{$id}" => Http::response(array_merge([
            'id' => (int) $id,
            'preapproval_id' => 'pre-1',
            'status' => 'processed',
            'debit_date' => '2026-10-03T10:00:00.000-03:00',
            'transaction_amount' => 18500.5,
            'currency_id' => 'ARS',
            'payment' => ['id' => 99000000001, 'status' => $status],
        ], $overrides)),
        'api.mercadopago.com/preapproval/pre-1' => Http::response(['id' => 'pre-1', 'status' => 'authorized', 'next_payment_date' => '2026-11-03T10:00:00.000-03:00']),
    ]);
}

function chargedSubscription(array $attributes = []): Subscription
{
    return Subscription::factory()->create(['provider_subscription_id' => 'pre-1', 'amount' => 15000, ...$attributes]);
}

test('an approved charge is invoiced as a factura C for what was charged, and its owners are told', function () {
    config(['invoicing.issuer' => 'fake']);
    fakeCharge('7001');
    $subscription = chargedSubscription();
    $owner = Membership::factory()->create(['organization_id' => $subscription->organization_id, 'roles' => [MembershipRole::Owner]]);

    postChargeNotification('7001', '9001')->assertOk();

    $invoice = Invoice::withoutGlobalScope('organization')->sole();
    expect($invoice->organization_id)->toBe($subscription->organization_id)
        ->and($invoice->subscription_id)->toBe($subscription->id)
        ->and($invoice->provider)->toBe(Subscription::PROVIDER_MERCADOPAGO)
        ->and($invoice->provider_payment_id)->toBe('7001')
        // What Mercado Pago charged, not the subscription's stored price.
        ->and($invoice->amount_cents)->toBe(1850050)
        ->and($invoice->currency)->toBe('ARS')
        ->and($invoice->service_from->toDateString())->toBe('2026-10-03')
        ->and($invoice->service_to->toDateString())->toBe('2026-11-02')
        ->and($invoice->description)->toBe('Suscripción mensual a Clini, plan Consultorio')
        ->and($invoice->status)->toBe(InvoiceStatus::Issued)
        ->and($invoice->environment)->toBe(InvoiceEnvironment::Fake)
        ->and($invoice->voucher_type->value)->toBe(11)
        ->and($invoice->number)->toBe(1)
        ->and($invoice->cae)->toHaveLength(14);
    expect($subscription->fresh()->status)->toBe(SubscriptionStatus::Active);

    Notification::assertSentTo($owner->user, InvoiceIssuedNotification::class);
});

test('a charge is invoiced once, whatever notifications repeat it', function () {
    config(['invoicing.issuer' => 'fake']);
    fakeCharge('7001');
    $subscription = chargedSubscription();
    Membership::factory()->create(['organization_id' => $subscription->organization_id, 'roles' => [MembershipRole::Owner]]);

    postChargeNotification('7001', '9001')->assertOk();
    postChargeNotification('7001', '9002')->assertOk();
    // The same notification again: acknowledged without processing.
    postChargeNotification('7001', '9002')->assertNoContent();

    expect(Invoice::withoutGlobalScope('organization')->count())->toBe(1);
    Notification::assertSentTimes(InvoiceIssuedNotification::class, 1);
});

test('issuing is queued after the charge is applied, so the subscription never waits on it', function () {
    Queue::fake([IssueInvoiceJob::class]);
    fakeCharge('7001');
    $subscription = chargedSubscription(['status' => SubscriptionStatus::Grace, 'grace_ends_at' => now()->addDays(3)]);

    postChargeNotification('7001', '9001')->assertOk();

    $invoice = Invoice::withoutGlobalScope('organization')->sole();
    expect($invoice->status)->toBe(InvoiceStatus::Pending)
        ->and($invoice->number)->toBeNull()
        ->and($subscription->fresh()->status)->toBe(SubscriptionStatus::Active);
    Queue::assertPushed(IssueInvoiceJob::class, fn (IssueInvoiceJob $job) => $job->invoiceId === $invoice->id);
});

test('ARCA failing leaves the invoice pending and the subscription applied', function () {
    config(['invoicing.issuer' => 'arca']);
    configureArca();
    Http::fake(['*afip.gov.ar/*' => Http::response('<html>503</html>', 503)]);
    fakeCharge('7001');
    $subscription = chargedSubscription(['status' => SubscriptionStatus::Expired]);

    // The tests' sync queue runs the job inline, so its failure reaches the response; a worker would retry it.
    postChargeNotification('7001', '9001')->assertStatus(503);

    expect($subscription->fresh()->status)->toBe(SubscriptionStatus::Active)
        ->and(Invoice::withoutGlobalScope('organization')->sole()->status)->toBe(InvoiceStatus::Pending);
});

test('an annual charge covers twelve months', function () {
    Queue::fake([IssueInvoiceJob::class]);
    fakeCharge('7001', overrides: ['debit_date' => '2026-01-31T10:00:00.000-03:00', 'transaction_amount' => 108000]);
    chargedSubscription()->forceFill(['billing' => 'annual'])->save();

    postChargeNotification('7001', '9001')->assertOk();

    $invoice = Invoice::withoutGlobalScope('organization')->sole();
    expect($invoice->service_from->toDateString())->toBe('2026-01-31')
        ->and($invoice->service_to->toDateString())->toBe('2027-01-30')
        ->and($invoice->amount_cents)->toBe(10800000)
        ->and($invoice->description)->toBe('Suscripción anual a Clini, plan Consultorio')
        // $ 15.000 a month, 40 % off, for a year: exactly what was charged.
        ->and($invoice->annual_discount_percent)->toBe(40)
        // Twelve undiscounted months: the PDF says the year saved $ 72.000 (#431).
        ->and($invoice->annual_list_amount_cents)->toBe(18000000);
});

test('an annual charge keeps the list price of the professionals it was charged for', function () {
    Queue::fake([IssueInvoiceJob::class]);
    // Seven active professionals: $ 25.000 a month, $ 15.000 with the discount.
    fakeCharge('7001', overrides: ['transaction_amount' => 180000]);
    $subscription = chargedSubscription();
    $subscription->forceFill(['billing' => 'annual'])->save();
    Membership::factory()->professional()->count(7)->create(['organization_id' => $subscription->organization_id]);

    postChargeNotification('7001', '9001')->assertOk();

    expect(Invoice::withoutGlobalScope('organization')->sole()->annual_list_amount_cents)->toBe(30000000);
});

test('an annual list price too large to read exactly is not kept, and the invoice claims no discount', function () {
    Queue::fake([IssueInvoiceJob::class]);
    // A month of 7.5 trillion pesos: the discounted year in cents still fits
    // in 2^53, and the charge is exactly it, but the list year doesn't.
    config(['plans.practice.base_amount' => 7_506_000_000_000]);
    fakeCharge('7001', overrides: ['transaction_amount' => 54_043_200_000_000]);
    chargedSubscription()->forceFill(['billing' => 'annual'])->save();

    postChargeNotification('7001', '9001')->assertOk();

    $invoice = Invoice::withoutGlobalScope('organization')->sole();
    expect($invoice->annual_discount_percent)->toBeNull()
        ->and($invoice->annual_list_amount_cents)->toBeNull();
});

test('an annual charge that is not the discounted price claims no discount', function () {
    Queue::fake([IssueInvoiceJob::class]);
    // The price changed since the checkout: the discount can't be told apart.
    fakeCharge('7001', overrides: ['transaction_amount' => 120000]);
    chargedSubscription()->forceFill(['billing' => 'annual'])->save();

    postChargeNotification('7001', '9001')->assertOk();

    $invoice = Invoice::withoutGlobalScope('organization')->sole();
    expect($invoice->annual_discount_percent)->toBeNull()
        ->and($invoice->annual_list_amount_cents)->toBeNull();
});

test('a monthly charge has no annual discount', function () {
    Queue::fake([IssueInvoiceJob::class]);
    fakeCharge('7001', overrides: ['transaction_amount' => 15000]);
    chargedSubscription();

    postChargeNotification('7001', '9001')->assertOk();

    $invoice = Invoice::withoutGlobalScope('organization')->sole();
    expect($invoice->annual_discount_percent)->toBeNull()
        ->and($invoice->annual_list_amount_cents)->toBeNull();
});

test('the service period starts on the charge\'s day in Argentina', function () {
    Queue::fake([IssueInvoiceJob::class]);
    // 02:30 UTC on the 4th: still the 3rd in Argentina.
    fakeCharge('7001', overrides: ['debit_date' => '2026-10-03T23:30:00.000-03:00']);
    chargedSubscription();

    postChargeNotification('7001', '9001')->assertOk();

    expect(Invoice::withoutGlobalScope('organization')->sole()->service_from->toDateString())->toBe('2026-10-03');
});

test('a late approved charge is invoiced even when it no longer changes the subscription', function () {
    Queue::fake([IssueInvoiceJob::class]);
    fakeCharge('7001', overrides: ['debit_date' => '2026-09-01T10:00:00.000-03:00']);
    $subscription = chargedSubscription(['status' => SubscriptionStatus::Grace, 'grace_ends_at' => now()->addDays(3), 'last_payment_failed_at' => '2026-10-01 13:00:00']);

    postChargeNotification('7001', '9001')->assertOk();

    expect($subscription->fresh()->status)->toBe(SubscriptionStatus::Grace)
        ->and(Invoice::withoutGlobalScope('organization')->sole()->service_from->toDateString())->toBe('2026-09-01');
});

test('a charge that is not approved is not invoiced', function (string $status) {
    Queue::fake([IssueInvoiceJob::class]);
    fakeCharge('7001', $status);
    chargedSubscription();

    postChargeNotification('7001', '9001')->assertOk();

    expect(Invoice::withoutGlobalScope('organization')->count())->toBe(0);
    Queue::assertNotPushed(IssueInvoiceJob::class);
})->with(['rejected', 'in_process']);

test('a charge of a subscription Clini does not know is not invoiced', function () {
    Queue::fake([IssueInvoiceJob::class]);
    fakeCharge('7001', overrides: ['preapproval_id' => 'pre-unknown']);
    chargedSubscription();

    postChargeNotification('7001', '9001')->assertOk();

    expect(Invoice::withoutGlobalScope('organization')->count())->toBe(0);
});

test('an approved charge without an amount in pesos activates the subscription but is not invoiced', function (array $overrides) {
    Queue::fake([IssueInvoiceJob::class]);
    Log::spy();
    fakeCharge('7001', overrides: $overrides);
    $subscription = chargedSubscription(['status' => SubscriptionStatus::Pending]);

    postChargeNotification('7001', '9001')->assertOk();

    expect($subscription->fresh()->status)->toBe(SubscriptionStatus::Active)
        ->and(Invoice::withoutGlobalScope('organization')->count())->toBe(0);
    Log::shouldHaveReceived('error')->once()->withArgs(fn (string $message, array $context) => str_contains($message, 'no invoice was recorded')
        && $context['subscription_id'] === $subscription->id && $context['payment_id'] === '7001');
})->with([
    'no amount' => [['transaction_amount' => null]],
    'another currency' => [['currency_id' => 'USD']],
    // Beyond what the panel reads exactly: never a wrapped or imprecise amount.
    'an amount too large to hold in cents' => [['transaction_amount' => 1.0e14]],
]);

test('the invoice issuer is never resolved by the webhook itself', function () {
    Queue::fake([IssueInvoiceJob::class]);
    app()->bind(InvoiceIssuer::class, fn () => throw new LogicException('resolved'));
    fakeCharge('7001');
    chargedSubscription();

    postChargeNotification('7001', '9001')->assertOk();

    expect(Invoice::withoutGlobalScope('organization')->count())->toBe(1);
});
