<?php

declare(strict_types=1);

use App\Enums\MembershipRole;
use App\Enums\SubscriptionBilling;
use App\Enums\SubscriptionStatus;
use App\Models\Membership;
use App\Models\MembershipInvitation;
use App\Models\Organization;
use App\Models\Subscription;
use App\Support\CurrentOrganization;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

beforeEach(function () {
    configureMercadoPago();
    Http::preventStrayRequests();
    Date::setTestNow('2026-10-10 12:00:00');
});

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
    Date::setTestNow();
});

/** Fakes the preapproval creation as `$id`, and any lookup or update of an existing one through `$existing`. */
function fakeAnnualCheckout(string $id = 'pre-new', ?Closure $existing = null): void
{
    Http::fake(function (Request $request) use ($id, $existing) {
        if ($request->method() === 'POST' && $request->url() === 'https://api.mercadopago.com/preapproval') {
            return Http::response(['id' => $id, 'status' => 'pending', 'init_point' => "https://mp.test/checkout/{$id}"], 201);
        }

        return $existing !== null ? $existing($request) : null;
    });
}

function annualOwner(int $professionals = 0): Membership
{
    $owner = Membership::factory()->owner()->create(['organization_id' => Organization::factory()->create()->id]);
    Membership::factory()->count($professionals)->professional()->create(['organization_id' => $owner->organization_id]);

    return $owner;
}

/** @return array<string, mixed>|null */
function annualPreapprovalCreated(): ?array
{
    $request = Http::recorded(fn (Request $request): bool => $request->method() === 'POST')->first()[0] ?? null;

    return $request?->data();
}

test('an owner subscribes yearly: one charge every 12 months of the discounted price', function (int $professionals, int $amount) {
    fakeAnnualCheckout();
    $owner = annualOwner($professionals);

    $this->actingAs($owner->user)->postJson('/api/v1/subscription', ['billing' => 'annual'])
        ->assertOk()
        ->assertJsonPath('data.init_point', 'https://mp.test/checkout/pre-new');

    expect(annualPreapprovalCreated()['auto_recurring'])->toBe([
        'frequency' => 12,
        'frequency_type' => 'months',
        'transaction_amount' => $amount,
        'currency_id' => 'ARS',
    ]);
    $subscription = Subscription::query()->withoutGlobalScope('organization')->sole();
    expect($subscription->billing)->toBe(SubscriptionBilling::Annual);
    expect($subscription->amount)->toBe($amount);
    $this->actingAs($owner->user)->getJson('/api/v1/subscription')
        ->assertJsonPath('data.billing', 'annual')
        ->assertJsonPath('data.amount', $amount);
})->with([
    // $15.000 × 60% = $9.000 a month, $108.000 a year: the landing's figures.
    'base price' => [0, 108000],
    // Seven professionals: $25.000 × 60% = $15.000 a month.
    'two extra professionals' => [7, 180000],
]);

test('the annual discount comes from the configuration', function () {
    config(['plans.practice.annual_discount_percent' => 25]);
    fakeAnnualCheckout();
    $owner = annualOwner();

    $this->actingAs($owner->user)->postJson('/api/v1/subscription', ['billing' => 'annual'])->assertOk();

    // $15.000 × 75% = $11.250 a month.
    expect(annualPreapprovalCreated()['auto_recurring']['transaction_amount'])->toBe(135000);
    $this->actingAs($owner->user)->getJson('/api/v1/plan')
        ->assertJsonPath('data.practice_pricing.annual_discount_percent', 25);
});

test('a checkout without billing, or a monthly one, keeps charging every month', function (array $body) {
    fakeAnnualCheckout();
    $owner = annualOwner();

    $this->actingAs($owner->user)->postJson('/api/v1/subscription', $body)->assertOk();

    expect(annualPreapprovalCreated()['auto_recurring']['frequency'])->toBe(1);
    expect(annualPreapprovalCreated()['auto_recurring']['transaction_amount'])->toBe(15000);
    expect(Subscription::query()->withoutGlobalScope('organization')->sole()->billing)->toBe(SubscriptionBilling::Monthly);
})->with([
    'no billing' => [[]],
    'monthly' => [['billing' => 'monthly']],
]);

test('an unknown billing is a validation error', function () {
    $owner = annualOwner();

    $this->actingAs($owner->user)->postJson('/api/v1/subscription', ['billing' => 'weekly'])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['billing']);

    Http::assertNothingSent();
});

test('a pending checkout of the other billing is replaced, since the provider cannot change its frequency', function () {
    fakeAnnualCheckout(existing: fn (Request $request) => $request->url() === 'https://api.mercadopago.com/preapproval/pre-monthly'
        ? Http::response(['id' => 'pre-monthly', 'status' => $request->method() === 'PUT' ? 'cancelled' : 'pending', 'init_point' => 'https://mp.test/checkout/pre-monthly'])
        : null);
    $owner = annualOwner();
    Subscription::factory()->withStatus(SubscriptionStatus::Pending)->create([
        'organization_id' => $owner->organization_id,
        'provider_subscription_id' => 'pre-monthly',
        'amount' => 15000,
    ]);

    $this->actingAs($owner->user)->postJson('/api/v1/subscription', ['billing' => 'annual'])
        ->assertOk()
        ->assertJsonPath('data.init_point', 'https://mp.test/checkout/pre-new');

    Http::assertSent(fn (Request $request): bool => $request->method() === 'PUT'
        && $request->url() === 'https://api.mercadopago.com/preapproval/pre-monthly'
        && $request['status'] === 'cancelled');
    $subscription = Subscription::query()->withoutGlobalScope('organization')->sole();
    expect($subscription->provider_subscription_id)->toBe('pre-new');
    expect($subscription->status)->toBe(SubscriptionStatus::Pending);
    expect($subscription->billing)->toBe(SubscriptionBilling::Annual);
    expect($subscription->amount)->toBe(108000);
});

test('a pending checkout of the same billing is reused', function () {
    fakeAnnualCheckout(existing: fn (Request $request) => Http::response(['id' => 'pre-annual', 'status' => 'pending', 'init_point' => 'https://mp.test/checkout/pre-annual']));
    $owner = annualOwner();
    Subscription::factory()->annual()->withStatus(SubscriptionStatus::Pending)->create([
        'organization_id' => $owner->organization_id,
        'provider_subscription_id' => 'pre-annual',
    ]);

    $this->actingAs($owner->user)->postJson('/api/v1/subscription', ['billing' => 'annual'])
        ->assertOk()
        ->assertJsonPath('data.init_point', 'https://mp.test/checkout/pre-annual');

    Http::assertNotSent(fn (Request $request): bool => $request->method() !== 'GET');
});

test('grace regularizes the period owed with the billing it has, whatever the request says', function () {
    fakeAnnualCheckout(existing: fn (Request $request) => Http::response(['id' => 'pre-annual', 'status' => 'authorized', 'init_point' => 'https://mp.test/checkout/pre-annual']));
    $owner = annualOwner();
    Subscription::factory()->annual()->inGrace(now()->addDays(3))->create([
        'organization_id' => $owner->organization_id,
        'provider_subscription_id' => 'pre-annual',
    ]);

    $this->actingAs($owner->user)->postJson('/api/v1/subscription', ['billing' => 'monthly'])
        ->assertOk()
        ->assertJsonPath('data.init_point', 'https://mp.test/checkout/pre-annual');

    Http::assertNotSent(fn (Request $request): bool => $request->method() !== 'GET');
    expect(Subscription::query()->withoutGlobalScope('organization')->sole()->billing)->toBe(SubscriptionBilling::Annual);
});

test('the webhook activates a yearly checkout with its renewal a year ahead', function () {
    Http::fake(['api.mercadopago.com/preapproval/pre-annual' => Http::response([
        'id' => 'pre-annual', 'status' => 'authorized', 'next_payment_date' => '2027-10-10T09:00:00.000-03:00',
    ])]);
    $subscription = Subscription::factory()->annual()->withStatus(SubscriptionStatus::Pending)->create([
        'provider_subscription_id' => 'pre-annual',
        'amount' => 108000,
    ]);

    $this->postJson(
        '/api/v1/webhooks/mercadopago?data.id=pre-annual&type=subscription_preapproval',
        ['id' => 'n-annual', 'type' => 'subscription_preapproval', 'action' => 'updated', 'data' => ['id' => 'pre-annual']],
        ['x-signature' => mercadoPagoSignature('pre-annual', 'req-annual', '1704908010'), 'x-request-id' => 'req-annual'],
    )->assertSuccessful();

    $subscription->refresh();
    expect($subscription->status)->toBe(SubscriptionStatus::Active);
    expect($subscription->next_payment_at?->toDateTimeString())->toBe('2027-10-10 12:00:00');
    expect($subscription->billing)->toBe(SubscriptionBilling::Annual);
});

test('a professional joining a yearly subscription reprices its next yearly charge', function () {
    Http::fake(['api.mercadopago.com/preapproval/*' => Http::response(['id' => 'pre-annual', 'status' => 'authorized'])]);
    $owner = annualOwner(5);
    Subscription::factory()->annual()->create([
        'organization_id' => $owner->organization_id,
        'provider_subscription_id' => 'pre-annual',
        'amount' => 108000,
    ]);
    $rawToken = Str::random(40);
    MembershipInvitation::factory()->create([
        'organization_id' => $owner->organization_id,
        'email' => 'sexta@example.com',
        'roles' => [MembershipRole::Professional],
        'token' => hash('sha256', $rawToken),
    ]);

    $this->withHeader('Referer', 'http://localhost:5174')->postJson('/api/v1/invitations/'.$rawToken, [
        'name' => 'Sexta Profesional',
        'password' => 'a-strong-password',
        'password_confirmation' => 'a-strong-password',
    ])->assertOk();

    // $20.000 × 60% = $12.000 a month.
    Http::assertSent(fn (Request $request): bool => $request->method() === 'PUT'
        && $request->data() === ['auto_recurring' => ['transaction_amount' => 144000, 'currency_id' => 'ARS']]);
    expect(Subscription::query()->withoutGlobalScope('organization')->sole()->amount)->toBe(144000);
});

test('cancelling a yearly subscription keeps Practice until the paid year ends, with no refund', function () {
    Http::fake(fn (Request $request) => Http::response(['id' => 'pre-annual', 'status' => $request->method() === 'PUT' ? 'cancelled' : 'authorized']));
    $owner = annualOwner();
    Subscription::factory()->annual()->renewingAt(now()->addMonths(9))->create([
        'organization_id' => $owner->organization_id,
        'provider_subscription_id' => 'pre-annual',
        'amount' => 108000,
    ]);

    $this->actingAs($owner->user)->deleteJson('/api/v1/subscription')
        ->assertOk()
        ->assertJsonPath('data.status', 'cancelled')
        ->assertJsonPath('data.access_ends_at', '2027-07-10T12:00:00+00:00');

    $this->actingAs($owner->user)->getJson('/api/v1/plan')->assertJsonPath('data.plan', 'practice');
});
