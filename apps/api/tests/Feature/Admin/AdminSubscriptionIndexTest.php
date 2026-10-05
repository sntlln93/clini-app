<?php

declare(strict_types=1);

use App\Enums\SubscriptionGraceReason;
use App\Enums\SubscriptionStatus;
use App\Models\Organization;
use App\Models\Subscription;
use App\Support\CurrentOrganization;
use Carbon\CarbonImmutable;

beforeEach(function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-04 15:00:00', 'UTC'));
});

afterEach(function () {
    freshRequestState();
});

function subscriptionFor(string $name, SubscriptionStatus $status, ?CarbonImmutable $graceEndsAt = null): Subscription
{
    $organization = Organization::factory()->create(['name' => $name]);
    $factory = $graceEndsAt === null
        ? Subscription::factory()->withStatus($status)
        : Subscription::factory()->inGrace($graceEndsAt);

    return $factory->create(['organization_id' => $organization->id]);
}

/**
 * @return array<int, string>
 */
function listedSubscriptionOrganizations(string $query = ''): array
{
    $data = actingAsAdmin()->getJson('/api/v1/admin/subscriptions'.($query === '' ? '' : '?'.$query))->json('data');

    return array_map(fn (array $item): string => $item['organization']['name'], $data);
}

test('the list exposes the operator shape, including grace_days_left and restricted', function () {
    $subscription = subscriptionFor('Consultorio Gracia', SubscriptionStatus::Grace, CarbonImmutable::parse('2026-10-06 12:00:00', 'UTC'));

    $item = actingAsAdmin()->getJson('/api/v1/admin/subscriptions')->json('data.0');

    expect(array_keys($item))->toEqualCanonicalizing([
        'id', 'organization', 'provider', 'provider_subscription_id', 'status', 'restricted', 'grace_ends_at',
        'grace_days_left', 'grace_reason', 'last_payment_at', 'last_payment_failed_at', 'next_payment_at',
        'cancelled_at', 'created_at', 'updated_at',
    ]);
    expect($item['id'])->toBe($subscription->id);
    expect($item['organization']['name'])->toBe('Consultorio Gracia');
    expect($item['status'])->toBe('grace');
    expect($item['restricted'])->toBeFalse();
    expect($item['grace_days_left'])->toBe(2);
    expect($item['grace_reason'])->toBe(SubscriptionGraceReason::PaymentFailed->value);
});

test('status filters the list and expired rows are restricted', function () {
    subscriptionFor('Activa', SubscriptionStatus::Active);
    subscriptionFor('Vencida', SubscriptionStatus::Expired);

    expect(listedSubscriptionOrganizations('status=expired'))->toBe(['Vencida']);
    freshRequestState();
    expect(actingAsAdmin()->getJson('/api/v1/admin/subscriptions?status=expired')->json('data.0.restricted'))->toBeTrue();
    freshRequestState();
    actingAsAdmin()->getJson('/api/v1/admin/subscriptions?status=paused')->assertStatus(422)->assertJsonValidationErrors(['status']);
});

test('grace_ending_within_days returns grace rows ending soon, overdue ones included, by grace_ends_at asc, ignoring status', function () {
    subscriptionFor('En tres días', SubscriptionStatus::Grace, now()->toImmutable()->addDays(3));
    subscriptionFor('Vencida sin procesar', SubscriptionStatus::Grace, now()->toImmutable()->subHour());
    subscriptionFor('En cinco días', SubscriptionStatus::Grace, now()->toImmutable()->addDays(5));
    subscriptionFor('Mañana', SubscriptionStatus::Grace, now()->toImmutable()->addDay());
    subscriptionFor('Activa', SubscriptionStatus::Active);

    expect(listedSubscriptionOrganizations('grace_ending_within_days=3'))->toBe(['Vencida sin procesar', 'Mañana', 'En tres días']);
    freshRequestState();
    expect(listedSubscriptionOrganizations('grace_ending_within_days=3&status=active'))->toBe(['Vencida sin procesar', 'Mañana', 'En tres días']);
    freshRequestState();
    actingAsAdmin()->getJson('/api/v1/admin/subscriptions?grace_ending_within_days=31')->assertStatus(422);
});

test('q searches the organization name or slug', function () {
    subscriptionFor('Clínica Norte', SubscriptionStatus::Active);
    subscriptionFor('Consultorio Sur', SubscriptionStatus::Active);

    expect(listedSubscriptionOrganizations('q=norte'))->toBe(['Clínica Norte']);
});

test('the default order is updated_at desc', function () {
    subscriptionFor('Vieja', SubscriptionStatus::Active);
    $this->travelTo(CarbonImmutable::parse('2026-10-04 16:00:00', 'UTC'));
    subscriptionFor('Nueva', SubscriptionStatus::Active);

    expect(listedSubscriptionOrganizations())->toBe(['Nueva', 'Vieja']);
});

test('show returns the subscription and is 404 for an unknown id', function () {
    $subscription = subscriptionFor('Consultorio', SubscriptionStatus::Active);

    actingAsAdmin()->getJson("/api/v1/admin/subscriptions/{$subscription->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $subscription->id)
        ->assertJsonPath('data.organization.name', 'Consultorio');
    freshRequestState();
    actingAsAdmin()->getJson('/api/v1/admin/subscriptions/999999')->assertNotFound();
});

test('a subscription of a soft-deleted organization is never listed and is 404 on show and grace extension', function () {
    $subscription = subscriptionFor('Borrada', SubscriptionStatus::Expired);
    Organization::query()->findOrFail($subscription->organization_id)->delete();
    subscriptionFor('Viva', SubscriptionStatus::Expired);

    expect(listedSubscriptionOrganizations())->toBe(['Viva']);
    freshRequestState();
    actingAsAdmin()->getJson("/api/v1/admin/subscriptions/{$subscription->id}")->assertNotFound();
    freshRequestState();
    actingAsAdmin()->postJson("/api/v1/admin/subscriptions/{$subscription->id}/grace-extension", ['grace_ends_on' => '2026-10-10'])
        ->assertNotFound();
});

test('the tenant scope left by an earlier clinic request does not hide subscriptions from operators', function () {
    $subscription = subscriptionFor('Otra organización', SubscriptionStatus::Active);
    $organization = Organization::factory()->create();
    app(CurrentOrganization::class)->set($organization->id);

    actingAsAdmin()->getJson("/api/v1/admin/subscriptions/{$subscription->id}")->assertOk();
});
