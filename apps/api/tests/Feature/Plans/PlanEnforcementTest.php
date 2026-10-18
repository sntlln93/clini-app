<?php

declare(strict_types=1);

use App\Enums\AppointmentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\SubscriptionStatus;
use App\Models\Appointment;
use App\Models\Membership;
use App\Models\MembershipInvitation;
use App\Models\Organization;
use App\Models\Prescription;
use App\Models\Subscription;
use App\Support\CurrentOrganization;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

beforeEach(function () {
    configureMercadoPago();
    Mail::fake();
});

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

function freeOwner(): Membership
{
    return Membership::factory()->owner()->create(['organization_id' => Organization::factory()->create()->id]);
}

function practiceOwner(): Membership
{
    $owner = freeOwner();
    Subscription::factory()->create(['organization_id' => $owner->organization_id, 'provider_subscription_id' => null]);

    return $owner;
}

function featureUnavailable(string $feature): array
{
    return ['code' => 'plans.feature_unavailable', 'message' => 'The organization plan does not include this feature.', 'context' => ['plan' => 'free', 'feature' => $feature]];
}

test('Free rejects inviting an owner, admin or staff', function (array $roles) {
    $owner = freeOwner();

    $this->actingAs($owner->user)->postJson('/api/v1/memberships/invitations', ['email' => 'nuevo@example.com', 'roles' => $roles])
        ->assertStatus(409)
        ->assertJsonPath('error', featureUnavailable('team'));

    expect(MembershipInvitation::query()->count())->toBe(0);
})->with([
    'owner' => [['owner']],
    'admin' => [['admin']],
    'staff' => [['staff']],
    'professional and staff' => [['professional', 'staff']],
]);

test('Free invites its one professional, but not a second one', function () {
    $owner = freeOwner();

    $this->actingAs($owner->user)->postJson('/api/v1/memberships/invitations', ['email' => 'uno@example.com', 'roles' => ['professional']])
        ->assertCreated();

    Membership::factory()->professional()->create(['organization_id' => $owner->organization_id]);

    $this->actingAs($owner->user)->postJson('/api/v1/memberships/invitations', ['email' => 'dos@example.com', 'roles' => ['professional']])
        ->assertStatus(409)
        ->assertJsonPath('error.context.feature', 'team');
});

test('accepting an invitation re-checks the plan: the professional limit filled since then rejects it', function () {
    $owner = freeOwner();
    $rawToken = Str::random(40);
    MembershipInvitation::factory()->create([
        'organization_id' => $owner->organization_id,
        'email' => 'tarde@example.com',
        'roles' => [MembershipRole::Professional],
        'token' => hash('sha256', $rawToken),
    ]);
    Membership::factory()->professional()->create(['organization_id' => $owner->organization_id]);

    $this->withHeader('Referer', 'http://localhost:5174')->postJson('/api/v1/invitations/'.$rawToken, [
        'name' => 'Llegó Tarde',
        'password' => 'a-strong-password',
        'password_confirmation' => 'a-strong-password',
    ])->assertStatus(409)->assertJsonPath('error.code', 'plans.feature_unavailable');

    expect(Membership::query()->withoutGlobalScope('organization')->where('organization_id', $owner->organization_id)->count())->toBe(2);
    expect(MembershipInvitation::query()->withoutGlobalScope('organization')->sole()->accepted_at)->toBeNull();
});

test('Practice and Center invite any role, with no professional limit', function (Membership $owner) {
    Membership::factory()->count(5)->professional()->create(['organization_id' => $owner->organization_id]);

    $this->actingAs($owner->user)->postJson('/api/v1/memberships/invitations', ['email' => 'sexta@example.com', 'roles' => ['professional', 'admin']])
        ->assertCreated();
})->with([
    'practice' => fn () => practiceOwner(),
    'center' => fn () => Membership::factory()->onPaidPlan()->owner()->create(),
]);

test('on Free, an update that gives a membership a team role or a second professional is rejected', function (array $before, array $payload) {
    $owner = freeOwner();
    Membership::factory()->professional()->create(['organization_id' => $owner->organization_id]);
    $target = Membership::factory()->create(['organization_id' => $owner->organization_id, ...$before]);

    $this->actingAs($owner->user)->patchJson("/api/v1/memberships/{$target->id}", $payload)
        ->assertStatus(409)
        ->assertJsonPath('error.context.feature', 'team');
})->with([
    'add professional' => [['roles' => [MembershipRole::Staff]], ['roles' => ['staff', 'professional'], 'status' => 'active']],
    'reactivate a professional' => [['roles' => [MembershipRole::Professional], 'status' => MembershipStatus::Inactive], ['roles' => ['professional'], 'status' => 'active']],
    'promote to admin' => [['roles' => [MembershipRole::Professional], 'status' => MembershipStatus::Suspended], ['roles' => ['admin'], 'status' => 'active']],
]);

test('on Free, a downgraded organization can still demote, suspend or keep the roles it already has', function (array $payload) {
    $owner = freeOwner();
    $target = Membership::factory()->withRoles(MembershipRole::Professional, MembershipRole::Staff)->create(['organization_id' => $owner->organization_id]);
    Membership::factory()->professional()->create(['organization_id' => $owner->organization_id]);

    $this->actingAs($owner->user)->patchJson("/api/v1/memberships/{$target->id}", $payload)->assertOk();
})->with([
    'keep the same roles' => [['roles' => ['professional', 'staff'], 'status' => 'active']],
    'drop a role' => [['roles' => ['staff'], 'status' => 'active']],
    'suspend' => [['roles' => ['professional', 'staff'], 'status' => 'suspended']],
]);

test('on Free, the owner becomes its one professional', function () {
    $owner = freeOwner();

    $this->actingAs($owner->user)->patchJson("/api/v1/memberships/{$owner->id}", ['roles' => ['owner', 'professional'], 'status' => 'active'])
        ->assertOk();
});

test('Free rejects recording or amending a prescription, but keeps them readable', function () {
    $owner = freeOwner();
    $professional = Membership::factory()->professional()->create(['organization_id' => $owner->organization_id]);
    $appointment = Appointment::factory()->create(['organization_id' => $owner->organization_id, 'membership_id' => $professional->id]);
    $prescription = Prescription::factory()->create(['appointment_id' => $appointment->id]);

    $this->actingAs($professional->user)->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", [])
        ->assertStatus(409)->assertJsonPath('error', featureUnavailable('prescriptions'));
    $this->actingAs($professional->user)->postJson("/api/v1/prescriptions/{$prescription->id}/amendments", [])
        ->assertStatus(409)->assertJsonPath('error.context.feature', 'prescriptions');

    $this->actingAs($professional->user)->getJson("/api/v1/patients/{$appointment->patient_id}/prescriptions")
        ->assertOk()->assertJsonPath('data.0.id', $prescription->id);
    $this->actingAs($professional->user)->getJson("/api/v1/appointments/{$appointment->id}/prescriptions")
        ->assertOk()->assertJsonPath('data.0.id', $prescription->id);
});

test('Free rejects the waiting room', function () {
    $owner = freeOwner();

    $this->actingAs($owner->user)->getJson('/api/v1/waiting-room?from=2026-08-05T00:00:00Z&to=2026-08-06T00:00:00Z')
        ->assertStatus(409)->assertJsonPath('error', featureUnavailable('waiting_room'));
});

test('Free rejects setting a professional booking link, but can clear one set before a downgrade, which keeps resolving', function () {
    $owner = freeOwner();
    $professional = Membership::factory()->professional()->create(['organization_id' => $owner->organization_id, 'slug' => 'dra-previa']);

    $this->actingAs($professional->user)->patchJson('/api/v1/memberships/me/slug', ['slug' => 'dra-nueva'])
        ->assertStatus(409)->assertJsonPath('error', featureUnavailable('professional_booking_links'));
    $this->getJson('/api/v1/booking/dra-previa')->assertOk();

    $this->actingAs($professional->user)->patchJson('/api/v1/memberships/me/slug', ['slug' => null])->assertOk();
    expect($professional->fresh()->slug)->toBeNull();
});

test('Free over its professional limit makes every agenda write read-only, the public booking too', function () {
    $owner = freeOwner();
    $professionals = Membership::factory()->count(2)->professional()->create(['organization_id' => $owner->organization_id]);
    $appointment = Appointment::factory()->create(['organization_id' => $owner->organization_id, 'membership_id' => $professionals[0]->id]);
    $organization = Organization::query()->findOrFail($owner->organization_id);

    $expected = ['code' => 'plans.professional_limit_exceeded', 'message' => 'The organization has more active professionals than its plan allows.', 'context' => [
        'plan' => 'free', 'professional_limit' => 1, 'active_professionals' => 2,
    ]];

    $this->actingAs($owner->user)->postJson('/api/v1/appointments', [])->assertStatus(409)->assertJsonPath('error', $expected);
    $this->actingAs($owner->user)->patchJson("/api/v1/appointments/{$appointment->id}/status", [])->assertStatus(409);
    $this->actingAs($owner->user)->postJson('/api/v1/availability-exceptions', [])->assertStatus(409);
    $this->postJson("/api/v1/booking/{$organization->slug}/appointments", [])->assertStatus(409)->assertJsonPath('error.code', 'plans.professional_limit_exceeded');
    $this->actingAs($owner->user)->getJson('/api/v1/appointments?from=2026-01-01T00:00:00Z&to=2027-01-01T00:00:00Z')->assertOk();

    // Deactivating the extra professional lifts it: nobody is deactivated for the owner.
    $this->actingAs($owner->user)->deleteJson("/api/v1/memberships/{$professionals[1]->id}")->assertSuccessful();
    $this->actingAs($owner->user)->postJson('/api/v1/appointments', [])->assertStatus(422);
});

test('an expired subscription stays read-only for its failed payment even within the professional limit', function () {
    $owner = freeOwner();
    Subscription::factory()->withStatus(SubscriptionStatus::Expired)->create(['organization_id' => $owner->organization_id]);

    $this->actingAs($owner->user)->postJson('/api/v1/appointments', [])
        ->assertStatus(409)->assertJsonPath('error.code', 'subscriptions.inactive');
});

test('the waiting room lists only the arrived appointments in range, with the agenda visibility', function () {
    $owner = Membership::factory()->onPaidPlan()->owner()->create();
    $professional = Membership::factory()->professional()->create(['organization_id' => $owner->organization_id]);
    $arrived = Appointment::factory()->create([
        'organization_id' => $owner->organization_id,
        'membership_id' => $professional->id,
        'status' => AppointmentStatus::Arrived,
        'start_at' => '2026-08-05 10:00:00',
        'end_at' => '2026-08-05 10:30:00',
        'arrived_at' => '2026-08-05 09:50:00',
    ]);
    Appointment::factory()->create([
        'organization_id' => $owner->organization_id,
        'membership_id' => $professional->id,
        'status' => AppointmentStatus::Confirmed,
        'start_at' => '2026-08-05 11:00:00',
        'end_at' => '2026-08-05 11:30:00',
    ]);
    Appointment::factory()->create(['status' => AppointmentStatus::Arrived, 'start_at' => '2026-08-05 10:00:00', 'end_at' => '2026-08-05 10:30:00']);

    $response = $this->actingAs($owner->user)->getJson('/api/v1/waiting-room?from=2026-08-05T00:00:00Z&to=2026-08-06T00:00:00Z');

    $response->assertOk();
    expect(collect($response->json('data'))->pluck('id')->all())->toBe([$arrived->id]);
    expect($response->json('data.0.arrived_at'))->not->toBeNull();
});

test('the waiting room validates its range', function () {
    $owner = Membership::factory()->onPaidPlan()->owner()->create();

    $this->actingAs($owner->user)->getJson('/api/v1/waiting-room?from=2026-08-10T00:00:00Z&to=2026-08-01T00:00:00Z')
        ->assertStatus(422)->assertJsonValidationErrors('to');
    $this->actingAs($owner->user)->getJson('/api/v1/waiting-room')
        ->assertStatus(422)->assertJsonValidationErrors(['from', 'to']);
});
