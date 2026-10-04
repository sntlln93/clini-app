<?php

declare(strict_types=1);

use App\Enums\ErrorCode;
use App\Enums\SubscriptionStatus;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Subscription;
use App\Support\CurrentOrganization;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    configureMercadoPago();
    Http::preventStrayRequests();
});

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
    Date::setTestNow();
});

function fakePreapprovalCreation(string $id = 'pre-new'): void
{
    Http::fake([
        'api.mercadopago.com/preapproval' => Http::response([
            'id' => $id,
            'status' => 'pending',
            'init_point' => "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id={$id}",
        ], 201),
    ]);
}

test('show returns null data for an organization that never subscribed', function () {
    $membership = Membership::factory()->staff()->create();

    $this->actingAs($membership->user)->getJson('/api/v1/subscription')
        ->assertOk()
        ->assertExactJson(['data' => null]);
});

test('show returns the status to any member, with the grace days left', function () {
    Date::setTestNow('2026-10-03 12:00:00');
    $membership = Membership::factory()->professional()->create();
    Subscription::factory()->inGrace(now()->addDays(4)->subHour())->create(['organization_id' => $membership->organization_id]);

    $this->actingAs($membership->user)->getJson('/api/v1/subscription')
        ->assertOk()
        ->assertJsonPath('data.status', 'grace')
        ->assertJsonPath('data.restricted', false)
        ->assertJsonPath('data.grace_days_left', 4);
});

test('show flags an expired subscription as restricted', function () {
    $membership = Membership::factory()->staff()->create();
    Subscription::factory()->withStatus(SubscriptionStatus::Expired)->create(['organization_id' => $membership->organization_id]);

    $this->actingAs($membership->user)->getJson('/api/v1/subscription')
        ->assertJsonPath('data.status', 'expired')
        ->assertJsonPath('data.restricted', true)
        ->assertJsonPath('data.grace_days_left', null);
});

test('show never exposes another organization\'s subscription', function () {
    $membership = Membership::factory()->create();
    Subscription::factory()->withStatus(SubscriptionStatus::Expired)->create();

    $this->actingAs($membership->user)->getJson('/api/v1/subscription')
        ->assertExactJson(['data' => null]);
});

test('show exposes the next payment date of the subscription', function () {
    Date::setTestNow('2026-10-03 12:00:00');
    $membership = Membership::factory()->staff()->create();
    Subscription::factory()->renewingAt(now()->addMonth())->create(['organization_id' => $membership->organization_id]);

    $this->actingAs($membership->user)->getJson('/api/v1/subscription')
        ->assertOk()
        ->assertJsonPath('data.next_payment_at', '2026-11-03T12:00:00+00:00')
        ->assertJsonPath('data.cancelled_at', null);
});

test('show keeps reporting the original cancellation date after a re-subscribe attempt on the cancelled row', function () {
    Date::setTestNow('2026-10-20 12:00:00');
    Http::fake([
        'api.mercadopago.com/preapproval/pre-1' => Http::response(['id' => 'pre-1', 'status' => 'cancelled']),
    ]);
    fakePreapprovalCreation('pre-2');
    $owner = Membership::factory()->owner()->create();
    Subscription::factory()->withStatus(SubscriptionStatus::Cancelled)->create([
        'organization_id' => $owner->organization_id,
        'provider_subscription_id' => 'pre-1',
        'cancelled_at' => '2026-10-01 09:00:00',
    ]);

    $this->actingAs($owner->user)->postJson('/api/v1/subscription')->assertOk();

    expect(Subscription::query()->sole()->provider_subscription_id)->toBe('pre-2');
    $this->actingAs($owner->user)->getJson('/api/v1/subscription')
        ->assertOk()
        ->assertJsonPath('data.status', 'cancelled')
        ->assertJsonPath('data.cancelled_at', '2026-10-01T09:00:00+00:00');
});

test('show requires authentication', function () {
    $this->getJson('/api/v1/subscription')->assertUnauthorized();
});

test('store creates a pending subscription for the owner and returns the checkout init_point', function () {
    fakePreapprovalCreation();
    $organization = Organization::factory()->create(['name' => 'Consultorio Uno']);
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);

    $this->actingAs($owner->user)->postJson('/api/v1/subscription')
        ->assertOk()
        ->assertJsonPath('data.init_point', 'https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=pre-new');

    $subscription = Subscription::query()->sole();
    expect($subscription->organization_id)->toBe($organization->id);
    expect($subscription->provider)->toBe('mercadopago');
    expect($subscription->provider_subscription_id)->toBe('pre-new');
    expect($subscription->status)->toBe(SubscriptionStatus::Pending);

    Http::assertSent(fn (Request $request): bool => $request['payer_email'] === $owner->user->email
        && $request['reason'] === 'Suscripción Clini — Consultorio Uno'
        && $request['external_reference'] === (string) $organization->id);
});

test('store is owner-only', function (string $role) {
    $membership = Membership::factory()->{$role}()->create();

    $this->actingAs($membership->user)->postJson('/api/v1/subscription')->assertForbidden();

    Http::assertNothingSent();
    expect(Subscription::count())->toBe(0);
})->with(['admin', 'staff', 'professional']);

test('store returns 409 when the subscription is already active', function () {
    $owner = Membership::factory()->owner()->create();
    Subscription::factory()->create(['organization_id' => $owner->organization_id]);

    $this->actingAs($owner->user)->postJson('/api/v1/subscription')
        ->assertStatus(409)
        ->assertJsonPath('error.code', ErrorCode::SubscriptionsAlreadyActive->value);

    Http::assertNothingSent();
});

test('store during grace reuses the existing provider subscription instead of creating a second one', function () {
    Http::fake([
        'api.mercadopago.com/preapproval/pre-1' => Http::response([
            'id' => 'pre-1',
            'status' => 'authorized',
            'init_point' => 'https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=pre-1',
        ]),
    ]);
    $owner = Membership::factory()->owner()->create();
    Subscription::factory()->inGrace(now()->addDays(3))->create([
        'organization_id' => $owner->organization_id,
        'provider_subscription_id' => 'pre-1',
    ]);

    $this->actingAs($owner->user)->postJson('/api/v1/subscription')
        ->assertOk()
        ->assertJsonPath('data.init_point', 'https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=pre-1');

    Http::assertNotSent(fn (Request $request): bool => $request->method() === 'POST');
});

test('store during grace replaces a paused provider subscription instead of reusing it', function () {
    Http::fake([
        'api.mercadopago.com/preapproval/pre-1' => Http::sequence()
            ->push([
                'id' => 'pre-1',
                'status' => 'paused',
                'init_point' => 'https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=pre-1',
            ])
            ->push(['id' => 'pre-1', 'status' => 'cancelled']),
        'api.mercadopago.com/preapproval' => Http::response([
            'id' => 'pre-2',
            'status' => 'pending',
            'init_point' => 'https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=pre-2',
        ], 201),
    ]);
    $owner = Membership::factory()->owner()->create();
    $subscription = Subscription::factory()->inGrace(now()->addDays(3))->create([
        'organization_id' => $owner->organization_id,
        'provider_subscription_id' => 'pre-1',
    ]);

    $this->actingAs($owner->user)->postJson('/api/v1/subscription')
        ->assertOk()
        ->assertJsonPath('data.init_point', 'https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=pre-2');

    Http::assertSent(fn (Request $request): bool => $request->method() === 'PUT'
        && $request->url() === 'https://api.mercadopago.com/preapproval/pre-1'
        && $request['status'] === 'cancelled');

    $subscription->refresh();
    expect($subscription->provider_subscription_id)->toBe('pre-2');
    expect($subscription->status)->toBe(SubscriptionStatus::Grace);
});

test('store keeps the old provider subscription live when creating its replacement fails', function (int $createStatus) {
    Http::fake([
        'api.mercadopago.com/preapproval/pre-1' => Http::response(['id' => 'pre-1', 'status' => 'paused']),
        'api.mercadopago.com/preapproval' => Http::response(
            $createStatus === 201 ? ['id' => 'pre-2', 'status' => 'pending'] : [],
            $createStatus,
        ),
    ]);
    $owner = Membership::factory()->owner()->create();
    $subscription = Subscription::factory()->inGrace(now()->addDays(3))->create([
        'organization_id' => $owner->organization_id,
        'provider_subscription_id' => 'pre-1',
    ]);

    $this->actingAs($owner->user)->postJson('/api/v1/subscription')
        ->assertStatus(409)
        ->assertJsonPath('error.code', ErrorCode::SubscriptionsGatewayUnavailable->value);

    Http::assertNotSent(fn (Request $request): bool => $request->method() === 'PUT');

    $subscription->refresh();
    expect($subscription->provider_subscription_id)->toBe('pre-1');
    expect($subscription->status)->toBe(SubscriptionStatus::Grace);
})->with([
    'provider error' => 500,
    'no init_point' => 201,
]);

test('store cancels the old provider subscription only after its replacement is created', function () {
    Http::fake([
        'api.mercadopago.com/preapproval/pre-1' => Http::sequence()
            ->push(['id' => 'pre-1', 'status' => 'paused'])
            ->push(['id' => 'pre-1', 'status' => 'cancelled']),
        'api.mercadopago.com/preapproval' => Http::response([
            'id' => 'pre-2',
            'status' => 'pending',
            'init_point' => 'https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=pre-2',
        ], 201),
    ]);
    $owner = Membership::factory()->owner()->create();
    Subscription::factory()->inGrace(now()->addDays(3))->create([
        'organization_id' => $owner->organization_id,
        'provider_subscription_id' => 'pre-1',
    ]);

    $this->actingAs($owner->user)->postJson('/api/v1/subscription')->assertOk();

    $methods = Http::recorded()->map(fn (array $pair): string => $pair[0]->method())->all();
    expect($methods)->toBe(['GET', 'POST', 'PUT']);
});

test('store for an expired subscription cancels the old provider subscription once a new one is created, and keeps it expired until paid', function () {
    Http::fake([
        'api.mercadopago.com/preapproval/pre-1' => Http::sequence()
            ->push(['id' => 'pre-1', 'status' => 'authorized', 'init_point' => 'https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=pre-1'])
            ->push(['id' => 'pre-1', 'status' => 'cancelled']),
        'api.mercadopago.com/preapproval' => Http::response([
            'id' => 'pre-2',
            'status' => 'pending',
            'init_point' => 'https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=pre-2',
        ], 201),
    ]);
    $owner = Membership::factory()->owner()->create();
    $subscription = Subscription::factory()->withStatus(SubscriptionStatus::Expired)->create([
        'organization_id' => $owner->organization_id,
        'provider_subscription_id' => 'pre-1',
    ]);

    $this->actingAs($owner->user)->postJson('/api/v1/subscription')
        ->assertOk()
        ->assertJsonPath('data.init_point', 'https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=pre-2');

    Http::assertSent(fn (Request $request): bool => $request->method() === 'PUT'
        && $request->url() === 'https://api.mercadopago.com/preapproval/pre-1'
        && $request['status'] === 'cancelled');

    $subscription->refresh();
    expect($subscription->provider_subscription_id)->toBe('pre-2');
    expect($subscription->status)->toBe(SubscriptionStatus::Expired);
});

test('store does not cancel an old provider subscription that is already cancelled', function () {
    Http::fake([
        'api.mercadopago.com/preapproval/pre-1' => Http::response(['id' => 'pre-1', 'status' => 'cancelled']),
        'api.mercadopago.com/preapproval' => Http::response([
            'id' => 'pre-2',
            'status' => 'pending',
            'init_point' => 'https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=pre-2',
        ], 201),
    ]);
    $owner = Membership::factory()->owner()->create();
    Subscription::factory()->withStatus(SubscriptionStatus::Cancelled)->create([
        'organization_id' => $owner->organization_id,
        'provider_subscription_id' => 'pre-1',
    ]);

    $this->actingAs($owner->user)->postJson('/api/v1/subscription')->assertOk();

    Http::assertNotSent(fn (Request $request): bool => $request->method() === 'PUT');
    expect(Subscription::query()->sole()->provider_subscription_id)->toBe('pre-2');
});

test('store refuses with 409 when the provider no longer finds the stored preapproval, creating nothing', function () {
    Http::fake([
        'api.mercadopago.com/preapproval/pre-1' => Http::response(['message' => 'not found'], 404),
    ]);
    $owner = Membership::factory()->owner()->create();
    $subscription = Subscription::factory()->inGrace(now()->addDays(3))->create([
        'organization_id' => $owner->organization_id,
        'provider_subscription_id' => 'pre-1',
    ]);

    $this->actingAs($owner->user)->postJson('/api/v1/subscription')
        ->assertStatus(409)
        ->assertJsonPath('error.code', ErrorCode::SubscriptionsGatewayUnavailable->value);

    Http::assertSentCount(1);
    expect($subscription->fresh()->provider_subscription_id)->toBe('pre-1');
});
