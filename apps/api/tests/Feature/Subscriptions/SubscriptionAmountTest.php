<?php

declare(strict_types=1);

use App\Actions\Subscriptions\SyncSubscriptionAmountAction;
use App\Data\Subscriptions\SubscriptionAmountSyncData;
use App\Enums\MembershipRole;
use App\Enums\SubscriptionStatus;
use App\Exceptions\Subscriptions\SubscriptionGatewayUnavailableException;
use App\Models\Membership;
use App\Models\MembershipInvitation;
use App\Models\Organization;
use App\Models\Subscription;
use App\Support\CurrentOrganization;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

beforeEach(function () {
    configureMercadoPago();
    Http::preventStrayRequests();
});

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

/** Fakes every preapproval PUT with `$status`, recording the amounts sent. */
function fakeAmountUpdates(int $status = 200): void
{
    Http::fake(['api.mercadopago.com/preapproval/*' => Http::response(['id' => 'pre-1', 'status' => 'authorized'], $status)]);
}

/** @return array<int, int> */
function amountsSent(): array
{
    return Http::recorded()
        ->filter(fn (array $pair): bool => $pair[0]->method() === 'PUT')
        ->map(fn (array $pair): int => $pair[0]['auto_recurring']['transaction_amount'])
        ->values()
        ->all();
}

function practiceWithProfessionals(int $count, array $subscription = []): Membership
{
    $owner = Membership::factory()->owner()->create(['organization_id' => Organization::factory()->create()->id]);
    Membership::factory()->count($count)->professional()->create(['organization_id' => $owner->organization_id]);
    Subscription::factory()->create([
        'organization_id' => $owner->organization_id,
        'provider_subscription_id' => 'pre-1',
        'amount' => 15000,
        ...$subscription,
    ]);

    return $owner;
}

test('checkout charges the base amount plus each active professional past the included five', function (int $professionals, int $amount) {
    Http::fake(['api.mercadopago.com/preapproval' => Http::response(['id' => 'pre-new', 'status' => 'pending', 'init_point' => 'https://mp.test/checkout'], 201)]);
    $owner = Membership::factory()->owner()->create(['organization_id' => Organization::factory()->create()->id]);
    Membership::factory()->count($professionals)->professional()->create(['organization_id' => $owner->organization_id]);
    Membership::factory()->professional()->create(['organization_id' => $owner->organization_id, 'status' => 'inactive']);

    $this->actingAs($owner->user)->postJson('/api/v1/subscription')->assertOk();

    Http::assertSent(fn (Request $request): bool => $request['auto_recurring']['transaction_amount'] === $amount
        && $request['auto_recurring']['currency_id'] === 'ARS');
    expect(Subscription::query()->sole()->amount)->toBe($amount);
    $this->actingAs($owner->user)->getJson('/api/v1/subscription')->assertJsonPath('data.amount', $amount);
})->with([
    'none yet' => [0, 15000],
    'five, all included' => [5, 15000],
    'seven, two extra' => [7, 25000],
]);

test('checkout is refused on Center, which is billed outside the platform', function () {
    $owner = Membership::factory()->onPaidPlan()->owner()->create();

    $this->actingAs($owner->user)->postJson('/api/v1/subscription')
        ->assertStatus(409)->assertJsonPath('error.code', 'plans.center_assigned');

    Http::assertNothingSent();
});

test('accepting a sixth professional raises the amount from the next charge', function () {
    fakeAmountUpdates();
    $owner = practiceWithProfessionals(5);
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

    expect(amountsSent())->toBe([20000]);
    expect(Subscription::query()->withoutGlobalScope('organization')->sole()->amount)->toBe(20000);
});

test('deactivating or demoting a professional past the included ones lowers the amount', function (Closure $change) {
    fakeAmountUpdates();
    $owner = practiceWithProfessionals(6, ['amount' => 20000]);
    $extra = Membership::query()->withoutGlobalScope('organization')
        ->where('organization_id', $owner->organization_id)->activeProfessional()->latest('id')->firstOrFail();

    $change($this, $owner, $extra)->assertSuccessful();

    expect(amountsSent())->toBe([15000]);
    expect(Subscription::query()->withoutGlobalScope('organization')->sole()->amount)->toBe(15000);
})->with([
    'deactivate' => [fn ($test, $owner, $extra) => $test->actingAs($owner->user)->deleteJson("/api/v1/memberships/{$extra->id}")],
    'demote to staff' => [fn ($test, $owner, $extra) => $test->actingAs($owner->user)->patchJson("/api/v1/memberships/{$extra->id}", ['roles' => ['staff'], 'status' => 'active'])],
]);

test('a change that leaves the amount where it was never calls the provider', function () {
    fakeAmountUpdates();
    $owner = practiceWithProfessionals(3);
    $professional = Membership::query()->withoutGlobalScope('organization')
        ->where('organization_id', $owner->organization_id)->activeProfessional()->firstOrFail();

    $this->actingAs($owner->user)->deleteJson("/api/v1/memberships/{$professional->id}")->assertSuccessful();

    Http::assertNothingSent();
});

test('the amount is never synced for a subscription that can no longer charge, nor on Center', function (array $subscription, bool $center) {
    fakeAmountUpdates();
    $owner = practiceWithProfessionals(7, $subscription);
    if ($center) {
        Organization::query()->findOrFail($owner->organization_id)->forceFill(['assigned_plan' => 'center'])->save();
    }

    $result = app(SyncSubscriptionAmountAction::class)->handle(new SubscriptionAmountSyncData($owner->organization_id));

    Http::assertNothingSent();
    expect($result?->amount)->toBe(15000);
})->with([
    'cancelled' => [['status' => SubscriptionStatus::Cancelled], false],
    'no provider subscription' => [['provider_subscription_id' => null], false],
    'center' => [[], true],
]);

test('a provider failure leaves the stored amount for the queued job to retry', function () {
    Http::fake(['api.mercadopago.com/preapproval/*' => Http::sequence()->push(['message' => 'boom'], 500)->push(['id' => 'pre-1'], 200)]);
    $owner = practiceWithProfessionals(7);

    expect(fn () => app(SyncSubscriptionAmountAction::class)->handle(new SubscriptionAmountSyncData($owner->organization_id)))
        ->toThrow(SubscriptionGatewayUnavailableException::class);
    expect(Subscription::query()->withoutGlobalScope('organization')->sole()->amount)->toBe(15000);

    app(SyncSubscriptionAmountAction::class)->handle(new SubscriptionAmountSyncData($owner->organization_id));
    expect(Subscription::query()->withoutGlobalScope('organization')->sole()->amount)->toBe(25000);
});
