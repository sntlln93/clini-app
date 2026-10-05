<?php

declare(strict_types=1);

use App\Enums\AppointmentStatus;
use App\Enums\SubscriptionStatus;
use App\Models\Appointment;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Patient;
use App\Models\Service;
use App\Models\Subscription;
use App\Models\SubscriptionEvent;
use App\Models\User;
use Carbon\CarbonImmutable;

beforeEach(function () {
    configureMercadoPago();
    // 12:00 in Buenos Aires (UTC−3).
    $this->travelTo(CarbonImmutable::parse('2026-10-04 15:00:00', 'UTC'));
});

afterEach(function () {
    freshRequestState();
});

/**
 * A known platform: three live organizations (one suspended, one without a
 * subscription) plus a soft-deleted one, three users (one unverified, one
 * blocked), two live patients plus a deleted one, and three appointments
 * of which one is deleted.
 *
 * @return array<string, mixed>
 */
function overviewFixture(): array
{
    $active = Organization::factory()->create(['name' => 'Consultorio Activo']);
    $suspended = Organization::factory()->create(['name' => 'Consultorio Suspendido']);
    $suspended->forceFill(['suspended_at' => now(), 'suspension_reason' => 'Deuda'])->save();
    $withoutSubscription = Organization::factory()->create(['name' => 'Consultorio Sin Suscripción']);
    $deleted = Organization::factory()->create(['name' => 'Consultorio Borrado']);

    Subscription::factory()->withStatus(SubscriptionStatus::Active)->create(['organization_id' => $active->id]);
    Subscription::factory()->inGrace(now()->addDays(3))->create(['organization_id' => $suspended->id]);
    $deletedSubscription = Subscription::factory()->withStatus(SubscriptionStatus::Active)->create(['organization_id' => $deleted->id]);
    $deleted->delete();

    $owner = User::factory()->create(['email' => 'owner@clini.test']);
    User::factory()->unverified()->create(['email' => 'unverified@clini.test']);
    User::factory()->create(['email' => 'blocked@clini.test'])
        ->forceFill(['blocked_at' => now(), 'block_reason' => 'Abuso'])->save();

    $membership = Membership::factory()->owner()->create(['organization_id' => $active->id, 'user_id' => $owner->id]);
    $patient = Patient::factory()->create();
    Patient::factory()->create();
    Patient::factory()->create()->delete();
    $service = Service::factory()->create();

    $scope = [
        'organization_id' => $active->id,
        'membership_id' => $membership->id,
        'patient_id' => $patient->id,
        'service_id' => $service->id,
    ];

    // Upcoming, created today.
    Appointment::factory()->create($scope + [
        'start_at' => now()->addDay(),
        'end_at' => now()->addDay()->addMinutes(30),
        'status' => AppointmentStatus::Scheduled,
    ]);
    // Created at 02:00 UTC today = 23:00 of the previous day in Buenos Aires.
    $previousLocalDay = Appointment::factory()->create($scope + [
        'start_at' => now()->subDay(),
        'end_at' => now()->subDay()->addMinutes(30),
        'status' => AppointmentStatus::Completed,
    ]);
    $previousLocalDay->forceFill(['created_at' => CarbonImmutable::parse('2026-10-04 02:00:00', 'UTC')])->save();
    Appointment::factory()->create($scope + [
        'start_at' => now()->addDays(2),
        'end_at' => now()->addDays(2)->addMinutes(30),
    ])->delete();

    return ['active' => $active, 'deletedSubscription' => $deletedSubscription];
}

test('KPIs count live rows only, across organizations', function () {
    overviewFixture();

    $response = actingAsAdmin()->getJson('/api/v1/admin/overview');

    $response->assertOk();
    expect($response->json('data.kpis.organizations'))->toBe(['total' => 3, 'suspended' => 1, 'new_in_period' => 3]);
    expect($response->json('data.kpis.users'))->toBe(['total' => 3, 'verified' => 2, 'blocked' => 1, 'new_in_period' => 3]);
    expect($response->json('data.kpis.patients'))->toBe(['total' => 2, 'new_in_period' => 2]);
    expect($response->json('data.kpis.appointments'))->toBe(['total' => 2, 'created_in_period' => 2, 'upcoming' => 1]);
});

test('subscription counts include none and sum to the live organizations, and MRR is paying × plan amount', function () {
    overviewFixture();

    $response = actingAsAdmin()->getJson('/api/v1/admin/overview');

    expect($response->json('data.kpis.subscriptions'))->toBe([
        'none' => 1, 'pending' => 0, 'active' => 1, 'grace' => 1, 'expired' => 0, 'cancelled' => 0,
    ]);
    expect(array_sum($response->json('data.kpis.subscriptions')))->toBe($response->json('data.kpis.organizations.total'));
    expect($response->json('data.kpis.mrr'))->toBe([
        'amount' => 30000, 'currency' => 'ARS', 'paying_subscriptions' => 2, 'plan_amount' => 15000,
    ]);
});

test('the series has one zero-filled point per local day, ascending, bucketed in the reporting timezone', function () {
    overviewFixture();

    $response = actingAsAdmin()->getJson('/api/v1/admin/overview?days=7');

    $response->assertOk();
    $series = $response->json('data.series');
    expect($series['from'])->toBe('2026-09-28');
    expect($series['to'])->toBe('2026-10-04');
    expect($series['timezone'])->toBe('America/Argentina/Buenos_Aires');
    expect(array_column($series['points'], 'date'))->toBe([
        '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04',
    ]);
    expect($series['points'][0])->toBe(['date' => '2026-09-28', 'organizations' => 0, 'users' => 0, 'appointments' => 0]);
    expect($series['points'][5])->toBe(['date' => '2026-10-03', 'organizations' => 0, 'users' => 0, 'appointments' => 1]);
    expect($series['points'][6])->toBe(['date' => '2026-10-04', 'organizations' => 3, 'users' => 3, 'appointments' => 1]);
});

test('days defaults to 30 and only accepts 7, 30 or 90', function () {
    actingAsAdmin()->getJson('/api/v1/admin/overview')
        ->assertOk()
        ->assertJsonCount(30, 'data.series.points')
        ->assertJsonPath('data.series.from', '2026-09-05');

    freshRequestState();
    actingAsAdmin()->getJson('/api/v1/admin/overview?days=90')->assertOk()->assertJsonCount(90, 'data.series.points');

    freshRequestState();
    actingAsAdmin()->getJson('/api/v1/admin/overview?days=15')
        ->assertStatus(422)
        ->assertJsonValidationErrors(['days']);
});

test('recent activity merges organizations, users and subscription events newest first, skipping orphaned events', function () {
    $fixture = overviewFixture();
    /** @var Organization $active */
    $active = $fixture['active'];
    $subscription = Subscription::withoutGlobalScope('organization')->where('organization_id', $active->id)->sole();

    $this->travelTo(CarbonImmutable::parse('2026-10-04 16:00:00', 'UTC'));
    SubscriptionEvent::query()->create([
        'provider' => 'mercadopago', 'notification_id' => 'n-1', 'type' => 'payment',
        'resource_id' => 'pay-1', 'subscription_id' => $subscription->id, 'payload' => ['id' => 1],
    ]);
    SubscriptionEvent::query()->create([
        'provider' => 'mercadopago', 'notification_id' => 'n-2', 'type' => 'payment',
        'resource_id' => 'pay-2', 'subscription_id' => null, 'payload' => ['id' => 2],
    ]);
    SubscriptionEvent::query()->create([
        'provider' => 'mercadopago', 'notification_id' => 'n-3', 'type' => 'payment',
        'resource_id' => 'pay-3', 'subscription_id' => $fixture['deletedSubscription']->id, 'payload' => ['id' => 3],
    ]);

    $response = actingAsAdmin()->getJson('/api/v1/admin/overview');

    $activity = $response->json('data.recent_activity');
    // 3 live organizations + 3 users + 1 linked event (the operator acting has no row here).
    expect($activity)->toHaveCount(7);
    expect($activity[0])->toBe([
        'kind' => 'subscription_event',
        'occurred_at' => '2026-10-04T16:00:00+00:00',
        'subject' => ['type' => 'subscription', 'id' => $subscription->id, 'label' => 'Consultorio Activo'],
        'detail' => 'payment',
    ]);

    $occurredAt = array_column($activity, 'occurred_at');
    $sorted = $occurredAt;
    rsort($sorted);
    expect($occurredAt)->toBe($sorted);

    $kinds = array_count_values(array_column($activity, 'kind'));
    expect($kinds)->toBe(['subscription_event' => 1, 'organization_created' => 3, 'user_registered' => 3]);

    $labels = array_map(fn (array $item): string => $item['subject']['label'], $activity);
    expect($labels)->toContain('owner@clini.test', 'Consultorio Suspendido');
    expect($labels)->not->toContain('Consultorio Borrado');
});

test('recent activity is capped at 15 items', function () {
    User::factory()->count(20)->create();

    actingAsAdmin()->getJson('/api/v1/admin/overview')
        ->assertOk()
        ->assertJsonCount(15, 'data.recent_activity');
});
