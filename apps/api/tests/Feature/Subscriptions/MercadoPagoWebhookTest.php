<?php

declare(strict_types=1);

use App\Enums\ErrorCode;
use App\Enums\SubscriptionGraceReason;
use App\Enums\SubscriptionStatus;
use App\Models\Membership;
use App\Models\Subscription;
use App\Models\SubscriptionEvent;
use App\Notifications\Subscriptions\SubscriptionGraceStartedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;

beforeEach(function () {
    configureMercadoPago();
    Http::preventStrayRequests();
    Notification::fake();
    Date::setTestNow('2026-10-03 12:00:00');
});

afterEach(function () {
    Date::setTestNow();
});

/**
 * Posts a signed Mercado Pago notification the way the provider does:
 * resource id in the `data.id` query parameter and in the body.
 *
 * @param  array<string, string>  $headers
 */
function postMercadoPagoNotification(string $type, string $dataId, string $notificationId = '9001', ?array $headers = null): TestResponse
{
    $requestId = 'req-'.$notificationId;

    return test()->postJson(
        "/api/v1/webhooks/mercadopago?data.id={$dataId}&type={$type}",
        [
            'id' => $notificationId,
            'type' => $type,
            'action' => 'updated',
            'data' => ['id' => $dataId],
        ],
        $headers ?? [
            'x-signature' => mercadoPagoSignature($dataId, $requestId, '1704908010'),
            'x-request-id' => $requestId,
        ],
    );
}

function fakePreapproval(string $id, string $status): void
{
    Http::fake([
        "api.mercadopago.com/preapproval/{$id}" => Http::response(['id' => $id, 'status' => $status]),
    ]);
}

function fakeAuthorizedPayment(string $id, string $preapprovalId, string $paymentStatus, ?string $debitDate = null): void
{
    Http::fake([
        "api.mercadopago.com/authorized_payments/{$id}" => Http::response(array_filter([
            'id' => (int) $id,
            'preapproval_id' => $preapprovalId,
            'status' => 'processed',
            'debit_date' => $debitDate,
            'payment' => ['status' => $paymentStatus],
        ], fn (mixed $value): bool => $value !== null)),
    ]);
}

test('a notification with an invalid signature returns 401 and processes nothing', function () {
    $subscription = Subscription::factory()->withStatus(SubscriptionStatus::Pending)->create(['provider_subscription_id' => 'pre-1']);

    postMercadoPagoNotification('subscription_preapproval', 'pre-1', headers: [
        'x-signature' => mercadoPagoSignature('pre-1', 'req-9001', '1704908010', 'wrong-secret'),
        'x-request-id' => 'req-9001',
    ])
        ->assertStatus(401)
        ->assertJsonPath('error.code', ErrorCode::SubscriptionsWebhookSignatureInvalid->value);

    Http::assertNothingSent();
    expect(SubscriptionEvent::count())->toBe(0);
    expect($subscription->fresh()->status)->toBe(SubscriptionStatus::Pending);
});

test('a notification without signature header returns 401', function () {
    postMercadoPagoNotification('subscription_preapproval', 'pre-1', headers: [])
        ->assertStatus(401);
});

test('an authorized preapproval activates a pending subscription', function () {
    fakePreapproval('pre-1', 'authorized');
    $subscription = Subscription::factory()->withStatus(SubscriptionStatus::Pending)->create(['provider_subscription_id' => 'pre-1']);

    postMercadoPagoNotification('subscription_preapproval', 'pre-1')->assertOk();

    expect($subscription->fresh()->status)->toBe(SubscriptionStatus::Active);
    expect(SubscriptionEvent::query()->sole()->subscription_id)->toBe($subscription->id);
});

test('an authorized preapproval update does not lift grace or expiry without a payment', function (SubscriptionStatus $status) {
    fakePreapproval('pre-1', 'authorized');
    $subscription = Subscription::factory()->withStatus($status)->create([
        'provider_subscription_id' => 'pre-1',
        'grace_ends_at' => $status === SubscriptionStatus::Grace ? now()->addDays(2) : null,
    ]);

    postMercadoPagoNotification('subscription_preapproval', 'pre-1')->assertOk();

    $subscription->refresh();
    expect($subscription->status)->toBe($status);
    expect($subscription->grace_ends_at?->toDateTimeString())
        ->toBe($status === SubscriptionStatus::Grace ? '2026-10-05 12:00:00' : null);
})->with([
    'grace' => SubscriptionStatus::Grace,
    'expired' => SubscriptionStatus::Expired,
]);

test('a cancelled preapproval cancels the subscription', function () {
    fakePreapproval('pre-1', 'cancelled');
    $subscription = Subscription::factory()->create(['provider_subscription_id' => 'pre-1']);

    postMercadoPagoNotification('subscription_preapproval', 'pre-1')->assertOk();

    expect($subscription->fresh()->status)->toBe(SubscriptionStatus::Cancelled);
});

test('pausing the preapproval of an active subscription opens the 7-day grace period and notifies its owners', function () {
    fakePreapproval('pre-1', 'paused');
    $subscription = Subscription::factory()->create(['provider_subscription_id' => 'pre-1']);
    $owner = Membership::factory()->owner()->create(['organization_id' => $subscription->organization_id]);

    postMercadoPagoNotification('subscription_preapproval', 'pre-1')->assertOk();

    $subscription->refresh();
    expect($subscription->status)->toBe(SubscriptionStatus::Grace);
    expect($subscription->grace_ends_at?->toDateTimeString())->toBe('2026-10-10 12:00:00');
    expect($subscription->last_payment_failed_at)->toBeNull();
    Notification::assertSentTo($owner->user, SubscriptionGraceStartedNotification::class);
});

test('pausing the preapproval during grace does not extend the grace period nor notify again', function () {
    fakePreapproval('pre-1', 'paused');
    $subscription = Subscription::factory()->inGrace(now()->addDays(2))->create(['provider_subscription_id' => 'pre-1']);
    Membership::factory()->owner()->create(['organization_id' => $subscription->organization_id]);

    postMercadoPagoNotification('subscription_preapproval', 'pre-1')->assertOk();

    $subscription->refresh();
    expect($subscription->status)->toBe(SubscriptionStatus::Grace);
    expect($subscription->grace_ends_at?->toDateTimeString())->toBe('2026-10-05 12:00:00');
    Notification::assertNothingSent();
});

test('resuming a paused preapproval lifts the grace period the pause opened', function () {
    Http::fake([
        'api.mercadopago.com/preapproval/pre-1' => Http::sequence()
            ->push(['id' => 'pre-1', 'status' => 'paused'])
            ->push(['id' => 'pre-1', 'status' => 'authorized']),
    ]);
    $subscription = Subscription::factory()->create(['provider_subscription_id' => 'pre-1']);

    postMercadoPagoNotification('subscription_preapproval', 'pre-1', 'n-pause')->assertOk();

    $subscription->refresh();
    expect($subscription->status)->toBe(SubscriptionStatus::Grace);
    expect($subscription->grace_reason)->toBe(SubscriptionGraceReason::Paused);

    postMercadoPagoNotification('subscription_preapproval', 'pre-1', 'n-resume')->assertOk();

    $subscription->refresh();
    expect($subscription->status)->toBe(SubscriptionStatus::Active);
    expect($subscription->grace_ends_at)->toBeNull();
    expect($subscription->grace_reason)->toBeNull();
});

test('a charge failing during a pause-opened grace keeps it in grace after a resume', function () {
    fakeAuthorizedPayment('7020', 'pre-1', 'rejected');
    fakePreapproval('pre-1', 'authorized');
    $subscription = Subscription::factory()->inGrace(now()->addDays(4), SubscriptionGraceReason::Paused)->create(['provider_subscription_id' => 'pre-1']);

    postMercadoPagoNotification('subscription_authorized_payment', '7020', 'n-fail')->assertOk();
    postMercadoPagoNotification('subscription_preapproval', 'pre-1', 'n-resume')->assertOk();

    $subscription->refresh();
    expect($subscription->status)->toBe(SubscriptionStatus::Grace);
    expect($subscription->grace_reason)->toBe(SubscriptionGraceReason::PaymentFailed);
    expect($subscription->grace_ends_at?->toDateTimeString())->toBe('2026-10-07 12:00:00');
});

test('a late approved charge from an earlier period does not lift a later failure', function (SubscriptionStatus $status) {
    fakeAuthorizedPayment('7010', 'pre-1', 'approved', '2026-09-01T10:00:00.000-03:00');
    $subscription = Subscription::factory()->withStatus($status)->create([
        'provider_subscription_id' => 'pre-1',
        'grace_ends_at' => $status === SubscriptionStatus::Grace ? now()->addDays(2) : null,
        'last_payment_at' => '2026-08-01 13:00:00',
        'last_payment_failed_at' => '2026-10-01 13:00:00',
    ]);

    postMercadoPagoNotification('subscription_authorized_payment', '7010')->assertOk();

    $subscription->refresh();
    expect($subscription->status)->toBe($status);
    expect($subscription->last_payment_at?->toDateTimeString())->toBe('2026-08-01 13:00:00');
})->with([
    'grace' => SubscriptionStatus::Grace,
    'expired' => SubscriptionStatus::Expired,
]);

test('a late failed charge from an earlier period does not move a paid subscription to grace', function () {
    fakeAuthorizedPayment('7011', 'pre-1', 'rejected', '2026-09-01T10:00:00.000-03:00');
    $subscription = Subscription::factory()->create([
        'provider_subscription_id' => 'pre-1',
        'last_payment_at' => '2026-10-01 13:00:00',
    ]);
    Membership::factory()->owner()->create(['organization_id' => $subscription->organization_id]);

    postMercadoPagoNotification('subscription_authorized_payment', '7011')->assertOk();

    $subscription->refresh();
    expect($subscription->status)->toBe(SubscriptionStatus::Active);
    expect($subscription->last_payment_failed_at)->toBeNull();
    Notification::assertNothingSent();
});

test('an approved retry of the charge that opened grace reactivates the subscription', function () {
    fakeAuthorizedPayment('7012', 'pre-1', 'approved', '2026-10-01T10:00:00.000-03:00');
    $subscription = Subscription::factory()->inGrace(now()->addDays(5))->create([
        'provider_subscription_id' => 'pre-1',
        'last_payment_failed_at' => '2026-10-01 13:00:00',
    ]);

    postMercadoPagoNotification('subscription_authorized_payment', '7012')->assertOk();

    $subscription->refresh();
    expect($subscription->status)->toBe(SubscriptionStatus::Active);
    expect($subscription->last_payment_at?->toDateTimeString())->toBe('2026-10-01 13:00:00');
});

test('a late failure of a charge that was eventually approved is ignored', function () {
    fakeAuthorizedPayment('7013', 'pre-1', 'rejected', '2026-10-01T10:00:00.000-03:00');
    $subscription = Subscription::factory()->create([
        'provider_subscription_id' => 'pre-1',
        'last_payment_at' => '2026-10-01 13:00:00',
        'last_payment_failed_at' => '2026-10-01 13:00:00',
    ]);

    postMercadoPagoNotification('subscription_authorized_payment', '7013')->assertOk();

    expect($subscription->fresh()->status)->toBe(SubscriptionStatus::Active);
    Notification::assertNothingSent();
});

test('a failed charge moves an active subscription to a 7-day grace period and notifies its owners', function () {
    fakeAuthorizedPayment('7001', 'pre-1', 'rejected');
    $subscription = Subscription::factory()->create(['provider_subscription_id' => 'pre-1']);
    $owner = Membership::factory()->owner()->create(['organization_id' => $subscription->organization_id]);
    $staff = Membership::factory()->staff()->create(['organization_id' => $subscription->organization_id]);

    postMercadoPagoNotification('subscription_authorized_payment', '7001')->assertOk();

    $subscription->refresh();
    expect($subscription->status)->toBe(SubscriptionStatus::Grace);
    expect($subscription->grace_ends_at?->toDateTimeString())->toBe('2026-10-10 12:00:00');
    expect($subscription->last_payment_failed_at?->toDateTimeString())->toBe('2026-10-03 12:00:00');
    expect($subscription->grace_reason)->toBe(SubscriptionGraceReason::PaymentFailed);

    Notification::assertSentTo($owner->user, SubscriptionGraceStartedNotification::class, function (SubscriptionGraceStartedNotification $notification) use ($owner): bool {
        $mail = $notification->toMail($owner->user);

        return $notification instanceof ShouldQueue
            && $mail->subject === 'No pudimos cobrar tu suscripción a Clini'
            && str_contains(implode(' ', $mail->introLines), '10/10/2026')
            && str_ends_with((string) $mail->actionUrl, '/ajustes')
            && $notification->via($owner->user) === ['mail'];
    });
    Notification::assertNotSentTo($staff->user, SubscriptionGraceStartedNotification::class);
});

test('a further failed charge during grace does not extend the grace period nor notify again', function () {
    fakeAuthorizedPayment('7002', 'pre-1', 'rejected');
    $subscription = Subscription::factory()->inGrace(now()->addDays(2))->create(['provider_subscription_id' => 'pre-1']);
    Membership::factory()->owner()->create(['organization_id' => $subscription->organization_id]);

    postMercadoPagoNotification('subscription_authorized_payment', '7002')->assertOk();

    $subscription->refresh();
    expect($subscription->status)->toBe(SubscriptionStatus::Grace);
    expect($subscription->grace_ends_at?->toDateTimeString())->toBe('2026-10-05 12:00:00');
    Notification::assertNothingSent();
});

test('an approved charge during grace reactivates the subscription without manual intervention', function () {
    fakeAuthorizedPayment('7003', 'pre-1', 'approved');
    $subscription = Subscription::factory()->inGrace(now()->addDays(3))->create(['provider_subscription_id' => 'pre-1']);

    postMercadoPagoNotification('subscription_authorized_payment', '7003')->assertOk();

    $subscription->refresh();
    expect($subscription->status)->toBe(SubscriptionStatus::Active);
    expect($subscription->grace_ends_at)->toBeNull();
    expect($subscription->last_payment_at?->toDateTimeString())->toBe('2026-10-03 12:00:00');
});

test('an approved charge reactivates an expired subscription', function () {
    fakeAuthorizedPayment('7004', 'pre-1', 'approved');
    $subscription = Subscription::factory()->withStatus(SubscriptionStatus::Expired)->create(['provider_subscription_id' => 'pre-1']);

    postMercadoPagoNotification('subscription_authorized_payment', '7004')->assertOk();

    expect($subscription->fresh()->status)->toBe(SubscriptionStatus::Active);
});

test('a late approved charge never reactivates a cancelled subscription', function () {
    fakeAuthorizedPayment('7005', 'pre-1', 'approved');
    fakePreapproval('pre-1', 'cancelled');
    $subscription = Subscription::factory()->withStatus(SubscriptionStatus::Cancelled)->create(['provider_subscription_id' => 'pre-1']);

    postMercadoPagoNotification('subscription_authorized_payment', '7005')->assertOk();

    $subscription->refresh();
    expect($subscription->status)->toBe(SubscriptionStatus::Cancelled);
    expect($subscription->last_payment_at)->toBeNull();
});

test('an approved charge whose preapproval the provider no longer finds never reactivates a cancelled subscription', function () {
    fakeAuthorizedPayment('7007', 'pre-1', 'approved');
    Http::fake([
        'api.mercadopago.com/preapproval/pre-1' => Http::response(['message' => 'not found'], 404),
    ]);
    $subscription = Subscription::factory()->withStatus(SubscriptionStatus::Cancelled)->create(['provider_subscription_id' => 'pre-1']);

    postMercadoPagoNotification('subscription_authorized_payment', '7007', 'n-gone')->assertOk();

    $subscription->refresh();
    expect($subscription->status)->toBe(SubscriptionStatus::Cancelled);
    expect($subscription->last_payment_at)->toBeNull();
    expect(SubscriptionEvent::query()->sole()->notification_id)->toBe('n-gone');
});

test('re-subscribing after a cancellation activates the org once the new preapproval charges', function () {
    Http::fake([
        'api.mercadopago.com/preapproval/pre-1' => Http::response(['id' => 'pre-1', 'status' => 'cancelled']),
        'api.mercadopago.com/preapproval/pre-2' => Http::response(['id' => 'pre-2', 'status' => 'authorized']),
        'api.mercadopago.com/preapproval' => Http::response([
            'id' => 'pre-2',
            'status' => 'pending',
            'init_point' => 'https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=pre-2',
        ], 201),
    ]);
    fakeAuthorizedPayment('7006', 'pre-2', 'approved');
    $owner = Membership::factory()->owner()->create();
    $subscription = Subscription::factory()->withStatus(SubscriptionStatus::Cancelled)->create([
        'organization_id' => $owner->organization_id,
        'provider_subscription_id' => 'pre-1',
    ]);

    $this->actingAs($owner->user)->postJson('/api/v1/subscription')->assertOk();
    expect($subscription->fresh()->status)->toBe(SubscriptionStatus::Cancelled);

    postMercadoPagoNotification('subscription_authorized_payment', '7006')->assertOk();

    $subscription->refresh();
    expect($subscription->provider_subscription_id)->toBe('pre-2');
    expect($subscription->status)->toBe(SubscriptionStatus::Active);
    expect($subscription->last_payment_at?->toDateTimeString())->toBe('2026-10-03 12:00:00');
});

test('an authorized replacement preapproval activates a cancelled subscription', function () {
    fakePreapproval('pre-2', 'authorized');
    $subscription = Subscription::factory()->withStatus(SubscriptionStatus::Cancelled)->create(['provider_subscription_id' => 'pre-2']);

    postMercadoPagoNotification('subscription_preapproval', 'pre-2')->assertOk();

    expect($subscription->fresh()->status)->toBe(SubscriptionStatus::Active);
});

test('the same notification delivered twice is processed once', function () {
    fakeAuthorizedPayment('7005', 'pre-1', 'rejected');
    $subscription = Subscription::factory()->create(['provider_subscription_id' => 'pre-1']);
    Membership::factory()->owner()->create(['organization_id' => $subscription->organization_id]);

    postMercadoPagoNotification('subscription_authorized_payment', '7005', 'n-1')->assertOk();

    // Reset to active to prove the redelivery is a no-op, not a re-application.
    $subscription->refresh()->update(['status' => SubscriptionStatus::Active, 'grace_ends_at' => null]);

    postMercadoPagoNotification('subscription_authorized_payment', '7005', 'n-1')->assertNoContent();

    expect(SubscriptionEvent::count())->toBe(1);
    expect($subscription->fresh()->status)->toBe(SubscriptionStatus::Active);
    Http::assertSentCount(1);
    Notification::assertSentTimes(SubscriptionGraceStartedNotification::class, 1);
});

test('a valid notification of an irrelevant type is acknowledged with 200 and logged', function () {
    $subscription = Subscription::factory()->create(['provider_subscription_id' => 'pre-1']);

    postMercadoPagoNotification('payment', '123')->assertOk();

    Http::assertNothingSent();
    expect(SubscriptionEvent::count())->toBe(1);
    expect($subscription->fresh()->status)->toBe(SubscriptionStatus::Active);
});

test('a notification for an unknown provider subscription is acknowledged and changes nothing', function () {
    fakePreapproval('pre-unknown', 'cancelled');
    $subscription = Subscription::factory()->create(['provider_subscription_id' => 'pre-1']);

    postMercadoPagoNotification('subscription_preapproval', 'pre-unknown')->assertOk();

    expect($subscription->fresh()->status)->toBe(SubscriptionStatus::Active);
    expect(SubscriptionEvent::query()->sole()->subscription_id)->toBeNull();
});

test('a provider outage answers non-2xx and does not log the event, so it is redelivered', function () {
    Http::fake([
        'api.mercadopago.com/preapproval/pre-1' => Http::response([], 500),
    ]);
    Subscription::factory()->withStatus(SubscriptionStatus::Pending)->create(['provider_subscription_id' => 'pre-1']);

    postMercadoPagoNotification('subscription_preapproval', 'pre-1')
        ->assertStatus(409)
        ->assertJsonPath('error.code', ErrorCode::SubscriptionsGatewayUnavailable->value);

    expect(SubscriptionEvent::count())->toBe(0);
});

test('a notification only affects the subscription it refers to', function () {
    fakePreapproval('pre-1', 'cancelled');
    $target = Subscription::factory()->create(['provider_subscription_id' => 'pre-1']);
    $other = Subscription::factory()->create(['provider_subscription_id' => 'pre-2']);

    postMercadoPagoNotification('subscription_preapproval', 'pre-1')->assertOk();

    expect($target->fresh()->status)->toBe(SubscriptionStatus::Cancelled);
    expect($other->fresh()->status)->toBe(SubscriptionStatus::Active);
});

test('a notification whose resource the provider does not find is acknowledged, changes nothing and is not logged', function (string $type, string $resourceId, string $endpoint, array $found) {
    Log::spy();
    // First lookup: the provider doesn't find it; a later delivery finds it.
    Http::fake([
        "api.mercadopago.com/{$endpoint}" => Http::sequence()
            ->push(['message' => 'not found'], 404)
            ->push($found),
    ]);
    $subscription = Subscription::factory()->withStatus(SubscriptionStatus::Pending)->create(['provider_subscription_id' => 'pre-1']);

    postMercadoPagoNotification($type, $resourceId, 'n-404')->assertNoContent();

    expect(SubscriptionEvent::count())->toBe(0);
    expect($subscription->fresh()->status)->toBe(SubscriptionStatus::Pending);
    Log::shouldHaveReceived('warning')
        ->withArgs(fn (string $message, array $context): bool => $context === ['endpoint' => '/'.$endpoint, 'provider_status' => 404])
        ->once();
    Log::shouldHaveReceived('warning')
        ->withArgs(fn (string $message, array $context): bool => ($context['notification_id'] ?? null) === 'n-404'
            && ($context['resource_id'] ?? null) === $resourceId)
        ->once();

    // A later genuine delivery with the same notification id is processed.
    postMercadoPagoNotification($type, $resourceId, 'n-404')->assertOk();

    expect(SubscriptionEvent::query()->sole()->notification_id)->toBe('n-404');
    expect($subscription->fresh()->status)->toBe(SubscriptionStatus::Active);
})->with([
    'preapproval' => ['subscription_preapproval', 'pre-1', 'preapproval/pre-1', ['id' => 'pre-1', 'status' => 'authorized']],
    'authorized payment' => ['subscription_authorized_payment', '7010', 'authorized_payments/7010', [
        'id' => 7010,
        'preapproval_id' => 'pre-1',
        'status' => 'processed',
        'payment' => ['status' => 'approved'],
    ]],
]);

test('a provider server error on an authorized payment answers 409 and does not log the event', function () {
    Http::fake([
        'api.mercadopago.com/authorized_payments/7011' => Http::response([], 500),
    ]);
    Subscription::factory()->create(['provider_subscription_id' => 'pre-1']);

    postMercadoPagoNotification('subscription_authorized_payment', '7011')
        ->assertStatus(409)
        ->assertJsonPath('error.code', ErrorCode::SubscriptionsGatewayUnavailable->value);

    expect(SubscriptionEvent::count())->toBe(0);
});

test('an authorization failure on the resource lookup still answers 409 so it is redelivered', function (int $status) {
    Http::fake([
        'api.mercadopago.com/preapproval/pre-1' => Http::response([], $status),
    ]);
    Subscription::factory()->withStatus(SubscriptionStatus::Pending)->create(['provider_subscription_id' => 'pre-1']);

    postMercadoPagoNotification('subscription_preapproval', 'pre-1')->assertStatus(409);

    expect(SubscriptionEvent::count())->toBe(0);
})->with([401, 403]);
