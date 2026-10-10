<?php

declare(strict_types=1);

use App\Enums\ErrorCode;
use App\Enums\SubscriptionGraceReason;
use App\Enums\SubscriptionStatus;
use App\Models\Membership;
use App\Models\Subscription;
use App\Support\CurrentOrganization;
use Carbon\CarbonImmutable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    configureMercadoPago();
    Http::preventStrayRequests();
    Date::setTestNow('2026-10-10 12:00:00');
});

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
    Date::setTestNow();
});

/**
 * Fakes the provider's lookup of `$id` (answering `$status` and
 * `$nextPaymentDate`) and its cancellation (answering `$cancelStatus`).
 */
function fakeCancellablePreapproval(string $id, string $status = 'authorized', int $cancelStatus = 200, ?string $nextPaymentDate = null): void
{
    Http::fake(function (Request $request) use ($id, $status, $cancelStatus, $nextPaymentDate) {
        if ($request->url() !== "https://api.mercadopago.com/preapproval/{$id}") {
            return null;
        }

        return $request->method() === 'PUT'
            ? Http::response(['id' => $id, 'status' => 'cancelled'], $cancelStatus)
            : Http::response(array_filter(['id' => $id, 'status' => $status, 'next_payment_date' => $nextPaymentDate]));
    });
}

function preapprovalCancellationSent(string $id): bool
{
    return Http::recorded(fn (Request $request): bool => $request->method() === 'PUT'
        && $request->url() === "https://api.mercadopago.com/preapproval/{$id}"
        && $request['status'] === 'cancelled')->isNotEmpty();
}

test('the owner cancels an active subscription, which keeps write access until the paid period ends', function () {
    fakeCancellablePreapproval('pre-1');
    $owner = Membership::factory()->owner()->create();
    $subscription = Subscription::factory()->renewingAt(now()->addDays(20))->create([
        'organization_id' => $owner->organization_id,
        'provider_subscription_id' => 'pre-1',
    ]);

    $this->actingAs($owner->user)->deleteJson('/api/v1/subscription')
        ->assertOk()
        ->assertJsonPath('data.status', 'cancelled')
        ->assertJsonPath('data.restricted', false)
        ->assertJsonPath('data.cancelled_at', '2026-10-10T12:00:00+00:00')
        ->assertJsonPath('data.access_ends_at', '2026-10-30T12:00:00+00:00')
        ->assertJsonPath('data.next_payment_at', null);

    expect(preapprovalCancellationSent('pre-1'))->toBeTrue();
    $subscription->refresh();
    expect($subscription->status)->toBe(SubscriptionStatus::Cancelled);
    expect($subscription->access_ends_at?->toDateTimeString())->toBe('2026-10-30 12:00:00');
    expect($subscription->next_payment_at)->toBeNull();
});

test('cancelling keeps the period the provider reports as paid when the stored renewal date lags behind', function (string $stored) {
    // The renewal was charged but its payment webhook hasn't refreshed the row.
    fakeCancellablePreapproval('pre-1', nextPaymentDate: '2026-11-10T09:00:00.000-03:00');
    $owner = Membership::factory()->owner()->create();
    Subscription::factory()->renewingAt(CarbonImmutable::parse($stored))->create([
        'organization_id' => $owner->organization_id,
        'provider_subscription_id' => 'pre-1',
    ]);

    $this->actingAs($owner->user)->deleteJson('/api/v1/subscription')
        ->assertOk()
        ->assertJsonPath('data.restricted', false)
        ->assertJsonPath('data.access_ends_at', '2026-11-10T12:00:00+00:00');
})->with([
    'already past' => '2026-10-10 09:00:00',
    'ahead, but earlier' => '2026-10-20 09:00:00',
]);

test('cancelling keeps the stored renewal date when it is later than the provider\'s', function () {
    fakeCancellablePreapproval('pre-1', nextPaymentDate: '2026-10-20T09:00:00.000-03:00');
    $owner = Membership::factory()->owner()->create();
    Subscription::factory()->renewingAt(now()->addDays(20))->create([
        'organization_id' => $owner->organization_id,
        'provider_subscription_id' => 'pre-1',
    ]);

    $this->actingAs($owner->user)->deleteJson('/api/v1/subscription')
        ->assertJsonPath('data.access_ends_at', '2026-10-30T12:00:00+00:00');
});

test('a cancelled subscription becomes read-only once its paid period ends', function () {
    fakeCancellablePreapproval('pre-1');
    $owner = Membership::factory()->owner()->create();
    Subscription::factory()->renewingAt(now()->addDays(20))->create([
        'organization_id' => $owner->organization_id,
        'provider_subscription_id' => 'pre-1',
    ]);

    $this->actingAs($owner->user)->deleteJson('/api/v1/subscription')->assertOk();

    Date::setTestNow('2026-10-30 11:59:59');
    $this->actingAs($owner->user)->getJson('/api/v1/subscription')->assertJsonPath('data.restricted', false);
    $this->actingAs($owner->user)->postJson('/api/v1/appointments', [])->assertStatus(422);

    Date::setTestNow('2026-10-30 12:00:00');
    $this->actingAs($owner->user)->getJson('/api/v1/subscription')->assertJsonPath('data.restricted', true);
    $this->actingAs($owner->user)->postJson('/api/v1/appointments', [])
        ->assertStatus(409)
        ->assertJsonPath('error.code', ErrorCode::SubscriptionsInactive->value)
        ->assertJsonPath('error.context.subscription_status', 'cancelled');
});

test('cancelling an unpaid subscription makes it read-only right away', function (Closure $state) {
    fakeCancellablePreapproval('pre-1');
    $owner = Membership::factory()->owner()->create();
    $subscription = $state(Subscription::factory())->create([
        'organization_id' => $owner->organization_id,
        'provider_subscription_id' => 'pre-1',
    ]);

    $this->actingAs($owner->user)->deleteJson('/api/v1/subscription')
        ->assertOk()
        ->assertJsonPath('data.status', 'cancelled')
        ->assertJsonPath('data.restricted', true)
        ->assertJsonPath('data.access_ends_at', null)
        ->assertJsonPath('data.grace_ends_at', null);

    expect(preapprovalCancellationSent('pre-1'))->toBeTrue();
    expect($subscription->fresh()->grace_reason)->toBeNull();
})->with([
    'in grace, even with a renewal date ahead' => fn ($factory) => $factory->inGrace(now()->addDays(3), SubscriptionGraceReason::Paused)->renewingAt(now()->addDays(20)),
    'expired' => fn ($factory) => $factory->withStatus(SubscriptionStatus::Expired),
    'active with no renewal date' => fn ($factory) => $factory,
    'active whose renewal date already passed' => fn ($factory) => $factory->renewingAt(now()->subDay()),
]);

test('cancelling is owner-only', function (string $role) {
    $membership = Membership::factory()->{$role}()->create();
    $subscription = Subscription::factory()->create(['organization_id' => $membership->organization_id]);

    $this->actingAs($membership->user)->deleteJson('/api/v1/subscription')->assertForbidden();

    Http::assertNothingSent();
    expect($subscription->fresh()->status)->toBe(SubscriptionStatus::Active);
})->with(['admin', 'staff', 'professional']);

test('cancelling requires authentication', function () {
    $this->deleteJson('/api/v1/subscription')->assertUnauthorized();
});

test('cancelling returns 409 when there is no subscription that could charge', function (?SubscriptionStatus $status) {
    $owner = Membership::factory()->owner()->create();

    if ($status !== null) {
        Subscription::factory()->withStatus($status)->create(['organization_id' => $owner->organization_id]);
    }

    $this->actingAs($owner->user)->deleteJson('/api/v1/subscription')
        ->assertStatus(409)
        ->assertJsonPath('error.code', ErrorCode::SubscriptionsNotCancellable->value)
        ->assertJsonPath('error.context.subscription_status', $status?->value);

    Http::assertNothingSent();
    expect(Subscription::query()->first()?->status)->toBe($status);
})->with([
    'no subscription' => null,
    'pending checkout' => SubscriptionStatus::Pending,
    'already cancelled' => SubscriptionStatus::Cancelled,
]);

test('cancelling leaves the local subscription unchanged when the provider fails to cancel', function (int $cancelStatus) {
    fakeCancellablePreapproval('pre-1', cancelStatus: $cancelStatus);
    $owner = Membership::factory()->owner()->create();
    $subscription = Subscription::factory()->renewingAt(now()->addDays(20))->create([
        'organization_id' => $owner->organization_id,
        'provider_subscription_id' => 'pre-1',
    ]);

    $this->actingAs($owner->user)->deleteJson('/api/v1/subscription')
        ->assertStatus(409)
        ->assertJsonPath('error.code', ErrorCode::SubscriptionsGatewayUnavailable->value);

    $subscription->refresh();
    expect($subscription->status)->toBe(SubscriptionStatus::Active);
    expect($subscription->cancelled_at)->toBeNull();
    expect($subscription->access_ends_at)->toBeNull();
    expect($subscription->next_payment_at?->toDateTimeString())->toBe('2026-10-30 12:00:00');
})->with([400, 500]);

test('cancelling leaves the local subscription unchanged when the provider cannot be reached', function () {
    Http::fake(fn () => throw new ConnectionException('timeout'));
    $owner = Membership::factory()->owner()->create();
    $subscription = Subscription::factory()->create(['organization_id' => $owner->organization_id]);

    $this->actingAs($owner->user)->deleteJson('/api/v1/subscription')
        ->assertStatus(409)
        ->assertJsonPath('error.code', ErrorCode::SubscriptionsGatewayUnavailable->value);

    expect($subscription->fresh()->status)->toBe(SubscriptionStatus::Active);
});

test('cancelling refuses with 409 when the provider no longer finds the stored preapproval', function () {
    Http::fake(['api.mercadopago.com/preapproval/pre-1' => Http::response([], 404)]);
    $owner = Membership::factory()->owner()->create();
    $subscription = Subscription::factory()->create([
        'organization_id' => $owner->organization_id,
        'provider_subscription_id' => 'pre-1',
    ]);

    $this->actingAs($owner->user)->deleteJson('/api/v1/subscription')
        ->assertStatus(409)
        ->assertJsonPath('error.code', ErrorCode::SubscriptionsGatewayUnavailable->value);

    expect(preapprovalCancellationSent('pre-1'))->toBeFalse();
    expect($subscription->fresh()->status)->toBe(SubscriptionStatus::Active);
});

test('cancelling does not cancel again a preapproval the provider already reports cancelled', function () {
    fakeCancellablePreapproval('pre-1', 'cancelled');
    $owner = Membership::factory()->owner()->create();
    Subscription::factory()->renewingAt(now()->addDays(20))->create([
        'organization_id' => $owner->organization_id,
        'provider_subscription_id' => 'pre-1',
    ]);

    $this->actingAs($owner->user)->deleteJson('/api/v1/subscription')
        ->assertOk()
        ->assertJsonPath('data.status', 'cancelled')
        ->assertJsonPath('data.access_ends_at', '2026-10-30T12:00:00+00:00');

    expect(preapprovalCancellationSent('pre-1'))->toBeFalse();
});

test('cancelling only touches the current organization\'s subscription', function () {
    fakeCancellablePreapproval('pre-mine');
    $owner = Membership::factory()->owner()->create();
    $mine = Subscription::factory()->create(['organization_id' => $owner->organization_id, 'provider_subscription_id' => 'pre-mine']);
    $other = Subscription::factory()->create(['provider_subscription_id' => 'pre-other']);

    $this->actingAs($owner->user)->deleteJson('/api/v1/subscription')->assertOk();

    expect($mine->fresh()->status)->toBe(SubscriptionStatus::Cancelled);
    expect($other->fresh()->status)->toBe(SubscriptionStatus::Active);
    expect(preapprovalCancellationSent('pre-other'))->toBeFalse();
});

test('re-subscribing after cancelling from the panel starts a new checkout, as before', function () {
    fakeCancellablePreapproval('pre-1');
    $owner = Membership::factory()->owner()->create();
    Subscription::factory()->renewingAt(now()->addDays(20))->create([
        'organization_id' => $owner->organization_id,
        'provider_subscription_id' => 'pre-1',
    ]);

    $this->actingAs($owner->user)->deleteJson('/api/v1/subscription')->assertOk();

    Http::fake([
        'api.mercadopago.com/preapproval/pre-1' => Http::response(['id' => 'pre-1', 'status' => 'cancelled']),
        'api.mercadopago.com/preapproval' => Http::response([
            'id' => 'pre-2',
            'status' => 'pending',
            'init_point' => 'https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=pre-2',
        ], 201),
    ]);

    $this->actingAs($owner->user)->postJson('/api/v1/subscription')
        ->assertOk()
        ->assertJsonPath('data.init_point', 'https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=pre-2');

    $subscription = Subscription::query()->sole();
    expect($subscription->provider_subscription_id)->toBe('pre-2');
    expect($subscription->status)->toBe(SubscriptionStatus::Cancelled);
    expect($subscription->access_ends_at?->toDateTimeString())->toBe('2026-10-30 12:00:00');
});
