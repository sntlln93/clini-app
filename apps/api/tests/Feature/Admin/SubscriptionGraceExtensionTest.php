<?php

declare(strict_types=1);

use App\Enums\AdminAuditAction;
use App\Enums\AdminAuditSubject;
use App\Enums\SubscriptionGraceReason;
use App\Enums\SubscriptionStatus;
use App\Models\AdminAuditLog;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Subscription;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    // 12:00 in Buenos Aires.
    $this->travelTo(CarbonImmutable::parse('2026-10-04 15:00:00', 'UTC'));
});

afterEach(function () {
    freshRequestState();
});

function graceSubscription(SubscriptionGraceReason $reason, string $endsAtUtc = '2026-10-06 12:00:00'): Subscription
{
    $organization = Organization::factory()->create(['name' => 'Consultorio en Gracia']);

    return Subscription::factory()
        ->inGrace(CarbonImmutable::parse($endsAtUtc, 'UTC'), $reason)
        ->create(['organization_id' => $organization->id]);
}

test('extending a grace period keeps its reason and stores the chosen day 23:59:59 Buenos Aires in UTC', function (SubscriptionGraceReason $reason) {
    $subscription = graceSubscription($reason);

    $response = actingAsAdmin()->postJson("/api/v1/admin/subscriptions/{$subscription->id}/grace-extension", [
        'grace_ends_on' => '2026-10-20',
        'note' => 'Acordado por teléfono',
    ]);

    $response->assertOk()
        ->assertJsonPath('data.status', 'grace')
        ->assertJsonPath('data.grace_ends_at', '2026-10-21T02:59:59+00:00')
        ->assertJsonPath('data.grace_reason', $reason->value)
        ->assertJsonPath('data.organization.name', 'Consultorio en Gracia');

    $subscription->refresh();
    expect($subscription->grace_ends_at?->toIso8601String())->toBe('2026-10-21T02:59:59+00:00');
    expect($subscription->grace_reason)->toBe($reason);

    $log = AdminAuditLog::query()->sole();
    expect($log->action)->toBe(AdminAuditAction::SubscriptionGraceExtended);
    expect($log->subject_type)->toBe(AdminAuditSubject::Subscription);
    expect($log->subject_id)->toBe($subscription->id);
    expect($log->metadata)->toEqual([
        'subject_label' => 'Consultorio en Gracia',
        'previous_status' => 'grace',
        'previous_grace_ends_at' => '2026-10-06T12:00:00+00:00',
        'previous_grace_reason' => $reason->value,
        'grace_ends_at' => '2026-10-21T02:59:59+00:00',
        'grace_reason' => $reason->value,
        'note' => 'Acordado por teléfono',
    ]);
})->with([
    'payment failed' => [SubscriptionGraceReason::PaymentFailed],
    'paused' => [SubscriptionGraceReason::Paused],
]);

test('extending an expired subscription reopens grace as payment_failed and lifts the write restriction', function () {
    $membership = Membership::factory()->owner()->create();
    $subscription = Subscription::factory()->withStatus(SubscriptionStatus::Expired)->create([
        'organization_id' => $membership->organization_id,
    ]);

    $this->actingAs($membership->user)->postJson('/api/v1/availability-exceptions', [])
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'subscriptions.inactive');
    freshRequestState();

    actingAsAdmin()->postJson("/api/v1/admin/subscriptions/{$subscription->id}/grace-extension", ['grace_ends_on' => '2026-10-10'])
        ->assertOk()
        ->assertJsonPath('data.status', 'grace')
        ->assertJsonPath('data.grace_reason', 'payment_failed')
        ->assertJsonPath('data.restricted', false);

    expect(AdminAuditLog::query()->sole()->metadata)->toMatchArray([
        'previous_status' => 'expired',
        'previous_grace_ends_at' => null,
        'previous_grace_reason' => null,
        'grace_reason' => 'payment_failed',
        'note' => null,
    ]);
    freshRequestState();

    // The write now reaches validation instead of the restriction.
    fromPanel()->actingAs($membership->user)->postJson('/api/v1/availability-exceptions', [])->assertStatus(422);
});

test('only grace or expired subscriptions can be extended', function (SubscriptionStatus $status) {
    $subscription = Subscription::factory()->withStatus($status)->create();

    actingAsAdmin()->postJson("/api/v1/admin/subscriptions/{$subscription->id}/grace-extension", ['grace_ends_on' => '2026-10-10'])
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'subscriptions.grace_extension_not_allowed')
        ->assertJsonPath('error.context.subscription_status', $status->value);

    expect(AdminAuditLog::query()->count())->toBe(0);
    expect($subscription->fresh()?->status)->toBe($status);
})->with([
    'active' => [SubscriptionStatus::Active],
    'pending' => [SubscriptionStatus::Pending],
    'cancelled' => [SubscriptionStatus::Cancelled],
]);

test('a grace extension must end strictly later than the current grace end', function () {
    // Current end: 2026-10-10 23:59:59 Buenos Aires.
    $subscription = graceSubscription(SubscriptionGraceReason::PaymentFailed, '2026-10-11 02:59:59');

    foreach (['2026-10-09', '2026-10-10'] as $date) {
        actingAsAdmin()->postJson("/api/v1/admin/subscriptions/{$subscription->id}/grace-extension", ['grace_ends_on' => $date])
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'subscriptions.grace_extension_not_later')
            ->assertJsonPath('error.context.current_grace_ends_at', '2026-10-11T02:59:59+00:00');
        freshRequestState();
    }

    expect(AdminAuditLog::query()->count())->toBe(0);
});

test('grace_ends_on must be a future date within 90 days', function (string $date) {
    $subscription = graceSubscription(SubscriptionGraceReason::PaymentFailed);

    actingAsAdmin()->postJson("/api/v1/admin/subscriptions/{$subscription->id}/grace-extension", ['grace_ends_on' => $date])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['grace_ends_on']);
})->with([
    'today' => ['2026-10-04'],
    'past' => ['2026-10-01'],
    'beyond 90 days' => ['2027-01-03'],
    'bad format' => ['04/10/2026'],
]);

test('the 90-day bound itself is accepted', function () {
    $subscription = graceSubscription(SubscriptionGraceReason::PaymentFailed);

    actingAsAdmin()->postJson("/api/v1/admin/subscriptions/{$subscription->id}/grace-extension", ['grace_ends_on' => '2027-01-02'])
        ->assertOk();
});

test('late in the Buenos Aires evening, tomorrow is accepted even though UTC is already on that day', function () {
    // 2026-10-04 23:30 in Buenos Aires = 2026-10-05 02:30 UTC.
    $this->travelTo(CarbonImmutable::parse('2026-10-05 02:30:00', 'UTC'));
    $subscription = graceSubscription(SubscriptionGraceReason::PaymentFailed, '2026-10-05 12:00:00');

    actingAsAdmin()->postJson("/api/v1/admin/subscriptions/{$subscription->id}/grace-extension", ['grace_ends_on' => '2026-10-05'])
        ->assertOk()
        ->assertJsonPath('data.grace_ends_at', '2026-10-06T02:59:59+00:00');
});

test('subscriptions:expire-grace keeps an extended grace until its new end, then expires it', function () {
    Notification::fake();
    $subscription = graceSubscription(SubscriptionGraceReason::PaymentFailed);

    actingAsAdmin()->postJson("/api/v1/admin/subscriptions/{$subscription->id}/grace-extension", ['grace_ends_on' => '2026-10-20'])
        ->assertOk();

    $this->travelTo(CarbonImmutable::parse('2026-10-21 02:59:00', 'UTC'));
    $this->artisan('subscriptions:expire-grace')->assertSuccessful();
    expect($subscription->fresh()?->status)->toBe(SubscriptionStatus::Grace);

    $this->travelTo(CarbonImmutable::parse('2026-10-21 03:00:00', 'UTC'));
    $this->artisan('subscriptions:expire-grace')->assertSuccessful();
    expect($subscription->fresh()?->status)->toBe(SubscriptionStatus::Expired);
});
