<?php

declare(strict_types=1);

use App\Enums\AppointmentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Appointment;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Patient;
use App\Models\Subscription;
use App\Models\User;
use Carbon\CarbonImmutable;

beforeEach(function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-04 15:00:00', 'UTC'));
});

afterEach(function () {
    freshRequestState();
});

test('show returns members, the full subscription and usage counts for that organization only', function () {
    $organization = Organization::factory()->create(['name' => 'Consultorio Uno', 'slug' => 'consultorio-uno']);
    $other = Organization::factory()->create();

    $owner = User::factory()->create(['email' => 'owner@clini.test']);
    $owner->forceFill(['blocked_at' => CarbonImmutable::parse('2026-10-01 12:00:00', 'UTC'), 'block_reason' => 'Abuso'])->save();
    $ownerMembership = Membership::factory()->owner()->create(['organization_id' => $organization->id, 'user_id' => $owner->id]);
    $this->travelTo(CarbonImmutable::parse('2026-10-04 15:05:00', 'UTC'));
    $professional = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    Membership::factory()->professional()->create(['organization_id' => $organization->id, 'status' => MembershipStatus::Inactive]);
    Membership::factory()->create(['organization_id' => $organization->id])->delete();

    Subscription::factory()->inGrace(CarbonImmutable::parse('2026-10-08 12:00:00', 'UTC'))->create([
        'organization_id' => $organization->id,
        'provider_subscription_id' => 'pre-123',
    ]);

    $organization->patients()->attach(Patient::factory()->count(2)->create());
    $deletedPatient = Patient::factory()->create();
    $organization->patients()->attach($deletedPatient);
    $deletedPatient->delete();
    $other->patients()->attach(Patient::factory()->create());

    $scope = ['organization_id' => $organization->id, 'membership_id' => $professional->id];
    Appointment::factory()->create($scope + ['start_at' => now()->addDay(), 'end_at' => now()->addDay()->addMinutes(30), 'status' => AppointmentStatus::Confirmed]);
    $old = Appointment::factory()->create($scope + ['start_at' => now()->subDays(40), 'end_at' => now()->subDays(40)->addMinutes(30), 'status' => AppointmentStatus::Completed]);
    $old->forceFill(['created_at' => now()->subDays(45)])->save();
    Appointment::factory()->create($scope + ['start_at' => now()->addDays(3), 'end_at' => now()->addDays(3)->addMinutes(30)])->delete();
    Appointment::factory()->create(['organization_id' => $other->id]);

    $response = actingAsAdmin()->getJson("/api/v1/admin/organizations/{$organization->id}");

    $response->assertOk();
    $data = $response->json('data');
    expect($data['id'])->toBe($organization->id);
    expect($data['active_members_count'])->toBe(2);
    expect($data['members'])->toHaveCount(3);
    expect($data['members'][0])->toBe([
        'membership_id' => $ownerMembership->id,
        'user' => [
            'id' => $owner->id,
            'name' => $owner->name,
            'email' => 'owner@clini.test',
            'blocked_at' => '2026-10-01T12:00:00+00:00',
            'email_verified_at' => $owner->email_verified_at?->toIso8601String(),
        ],
        'roles' => [MembershipRole::Owner->value],
        'status' => 'active',
        'created_at' => '2026-10-04T15:00:00+00:00',
    ]);
    expect($data['subscription'])->toMatchArray([
        'status' => 'grace',
        'provider' => 'mercadopago',
        'provider_subscription_id' => 'pre-123',
        'grace_ends_at' => '2026-10-08T12:00:00+00:00',
        'grace_reason' => 'payment_failed',
        'restricted' => false,
        'organization' => ['id' => $organization->id, 'name' => 'Consultorio Uno', 'slug' => 'consultorio-uno', 'suspended_at' => null],
    ]);
    expect($data['usage'])->toBe([
        'patients' => 2,
        'professionals' => 1,
        'appointments_total' => 2,
        'appointments_last_30_days' => 1,
        'appointments_upcoming' => 1,
        'last_appointment_created_at' => '2026-10-04T15:05:00+00:00',
    ]);
});

test('show returns null subscription and zero usage for an empty organization', function () {
    $organization = Organization::factory()->create();

    $data = actingAsAdmin()->getJson("/api/v1/admin/organizations/{$organization->id}")->json('data');

    expect($data['subscription'])->toBeNull();
    expect($data['members'])->toBe([]);
    expect($data['usage']['last_appointment_created_at'])->toBeNull();
    expect($data['usage']['appointments_total'])->toBe(0);
});

test('show is 404 for an unknown or soft-deleted organization', function () {
    $deleted = Organization::factory()->create();
    $deleted->delete();

    actingAsAdmin()->getJson('/api/v1/admin/organizations/999999')->assertNotFound();
    freshRequestState();
    actingAsAdmin()->getJson("/api/v1/admin/organizations/{$deleted->id}")->assertNotFound();
});

test('suspension_reason is exposed to operators but never in the clinic /me payload', function () {
    $membership = Membership::factory()->owner()->create();
    /** @var Organization $organization */
    $organization = $membership->organization;
    $organization->forceFill(['suspended_at' => now(), 'suspension_reason' => 'Motivo interno'])->save();

    actingAsAdmin()->getJson("/api/v1/admin/organizations/{$organization->id}")
        ->assertJsonPath('data.suspension_reason', 'Motivo interno');
    freshRequestState();

    $me = fromPanel()->actingAs($membership->user)->getJson('/api/v1/me');

    $me->assertOk();
    expect($me->json('organization.suspended_at'))->not->toBeNull();
    expect($me->json('organization'))->not->toHaveKey('suspension_reason');
    expect($me->getContent())->not->toContain('Motivo interno');
});
