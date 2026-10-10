<?php

declare(strict_types=1);

use App\Enums\SubscriptionStatus;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Subscription;
use App\Support\CurrentOrganization;
use Illuminate\Support\Facades\Date;

beforeEach(function () {
    configureMercadoPago();
});

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
    Date::setTestNow();
});

test('a new organization with no subscription is on Free, with every paid function off', function () {
    $owner = Membership::factory()->owner()->create();

    $this->actingAs($owner->user)->getJson('/api/v1/plan')
        ->assertOk()
        ->assertExactJson(['data' => [
            'plan' => 'free',
            'assigned_by_platform' => false,
            'features' => [
                'team' => false,
                'waiting_room' => false,
                'prescriptions' => false,
                'professional_booking_links' => false,
            ],
            'professional_limit' => 1,
            'active_professionals' => 0,
            'restricted' => false,
            'appointment_limit' => 40,
            'appointment_warning_threshold' => 35,
            'appointments_this_month' => 0,
            'practice_pricing' => [
                'base_amount' => 15000,
                'included_professionals' => 5,
                'extra_professional_amount' => 5000,
                'currency' => 'ARS',
            ],
        ]]);
});

test('the plan follows the subscription: Practice while it grants access, Free otherwise', function (SubscriptionStatus $status, array $attributes, string $plan) {
    Date::setTestNow('2026-10-10 12:00:00');
    $member = Membership::factory()->staff()->create();
    Subscription::factory()->withStatus($status)->create(['organization_id' => $member->organization_id, ...$attributes]);

    $this->actingAs($member->user)->getJson('/api/v1/plan')
        ->assertOk()
        ->assertJsonPath('data.plan', $plan)
        ->assertJsonPath('data.features.prescriptions', $plan === 'practice')
        ->assertJsonPath('data.professional_limit', $plan === 'practice' ? null : 1)
        ->assertJsonPath('data.appointment_limit', $plan === 'practice' ? null : 40);
})->with([
    'active' => [SubscriptionStatus::Active, [], 'practice'],
    'grace' => [SubscriptionStatus::Grace, [], 'practice'],
    'expired, still owing its period' => [SubscriptionStatus::Expired, [], 'practice'],
    'cancelled with paid time left' => [SubscriptionStatus::Cancelled, ['access_ends_at' => '2026-10-10 12:00:01'], 'practice'],
    'cancelled, paid time over' => [SubscriptionStatus::Cancelled, ['access_ends_at' => '2026-10-10 12:00:00'], 'free'],
    'cancelled with no paid time' => [SubscriptionStatus::Cancelled, [], 'free'],
    'pending checkout' => [SubscriptionStatus::Pending, [], 'free'],
]);

test('an operator-assigned Center wins over the subscription and lifts every limit', function () {
    $organization = Organization::factory()->center()->create();
    $member = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    Subscription::factory()->withStatus(SubscriptionStatus::Pending)->create(['organization_id' => $organization->id]);

    $this->actingAs($member->user)->getJson('/api/v1/plan')
        ->assertOk()
        ->assertJsonPath('data.plan', 'center')
        ->assertJsonPath('data.assigned_by_platform', true)
        ->assertJsonPath('data.features.team', true)
        ->assertJsonPath('data.professional_limit', null)
        ->assertJsonPath('data.appointment_limit', null)
        ->assertJsonPath('data.appointment_warning_threshold', null)
        ->assertJsonPath('data.active_professionals', 1);
});

test('Free with more active professionals than its limit is reported as restricted', function () {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    Membership::factory()->count(2)->professional()->create(['organization_id' => $organization->id]);
    Membership::factory()->professional()->create(['organization_id' => $organization->id, 'status' => 'inactive']);

    $this->actingAs($owner->user)->getJson('/api/v1/plan')
        ->assertOk()
        ->assertJsonPath('data.active_professionals', 2)
        ->assertJsonPath('data.restricted', true);
});

test('another organization\'s plan never leaks', function () {
    $member = Membership::factory()->staff()->create();
    Subscription::factory()->create();

    $this->actingAs($member->user)->getJson('/api/v1/plan')->assertJsonPath('data.plan', 'free');
});

test('the plan requires authentication', function () {
    $this->getJson('/api/v1/plan')->assertUnauthorized();
});
