<?php

declare(strict_types=1);

use App\Models\Appointment;
use App\Models\Membership;
use App\Models\Organization;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('index returns only appointments whose start_at falls in the from/to range, ordered by start_at', function () {
    $membership = Membership::factory()->create();

    $later = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'start_at' => '2026-08-05 15:00:00',
        'end_at' => '2026-08-05 15:30:00',
    ]);
    $earlier = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'start_at' => '2026-08-05 09:00:00',
        'end_at' => '2026-08-05 09:30:00',
    ]);
    $outOfRange = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'start_at' => '2026-08-10 09:00:00',
        'end_at' => '2026-08-10 09:30:00',
    ]);

    $response = $this->actingAs($membership->user)->getJson('/api/v1/appointments?from=2026-08-05&to=2026-08-06');

    $response->assertSuccessful();
    $ids = collect($response->json('data'))->pluck('id')->all();

    expect($ids)->toBe([$earlier->id, $later->id]);
    expect($ids)->not->toContain($outOfRange->id);
});

test('index never leaks another organization\'s appointments', function () {
    $membership = Membership::factory()->create();
    $otherMembership = Membership::factory()->create();

    $own = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'start_at' => '2026-08-05 10:00:00',
        'end_at' => '2026-08-05 10:30:00',
    ]);
    Appointment::factory()->create([
        'organization_id' => $otherMembership->organization_id,
        'membership_id' => $otherMembership->id,
        'start_at' => '2026-08-05 10:00:00',
        'end_at' => '2026-08-05 10:30:00',
    ]);

    $response = $this->actingAs($membership->user)->getJson('/api/v1/appointments?from=2026-08-01&to=2026-08-10');

    $response->assertSuccessful();
    expect(collect($response->json('data'))->pluck('id')->all())->toBe([$own->id]);
});

test('index filtered by membership_id returns only that professional\'s appointments', function () {
    $organization = Organization::factory()->create();
    $membershipA = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $membershipB = Membership::factory()->create(['organization_id' => $organization->id]);

    $appointmentA = Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membershipA->id,
        'start_at' => '2026-08-05 10:00:00',
        'end_at' => '2026-08-05 10:30:00',
    ]);
    Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membershipB->id,
        'start_at' => '2026-08-05 11:00:00',
        'end_at' => '2026-08-05 11:30:00',
    ]);

    $response = $this->actingAs($membershipA->user)->getJson(
        "/api/v1/appointments?from=2026-08-01&to=2026-08-10&membership_id={$membershipA->id}"
    );

    $response->assertSuccessful();
    expect(collect($response->json('data'))->pluck('id')->all())->toBe([$appointmentA->id]);
});

test('index for a membership holding only appointments.view.own returns only its own appointments, while an org-wide viewer sees every professional\'s', function () {
    $organization = Organization::factory()->create();
    $professional = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $another = Membership::factory()->create(['organization_id' => $organization->id]);

    $ownAppointment = Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $professional->id,
        'start_at' => '2026-08-05 10:00:00',
        'end_at' => '2026-08-05 10:30:00',
    ]);
    $anotherAppointment = Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $another->id,
        'start_at' => '2026-08-05 11:00:00',
        'end_at' => '2026-08-05 11:30:00',
    ]);

    $professionalResponse = $this->actingAs($professional->user)->getJson('/api/v1/appointments?from=2026-08-01&to=2026-08-10');
    $professionalResponse->assertSuccessful();
    expect(collect($professionalResponse->json('data'))->pluck('id')->all())->toBe([$ownAppointment->id]);

    $ownerResponse = $this->actingAs($owner->user)->getJson('/api/v1/appointments?from=2026-08-01&to=2026-08-10');
    $ownerResponse->assertSuccessful();
    expect(collect($ownerResponse->json('data'))->pluck('id')->sort()->values()->all())
        ->toBe(collect([$ownAppointment->id, $anotherAppointment->id])->sort()->values()->all());
});

test('index returns 422 when from or to is missing, and when to is before from', function () {
    $membership = Membership::factory()->create();

    $this->actingAs($membership->user)->getJson('/api/v1/appointments?to=2026-08-10')
        ->assertStatus(422)->assertJsonValidationErrors('from');

    $this->actingAs($membership->user)->getJson('/api/v1/appointments?from=2026-08-01')
        ->assertStatus(422)->assertJsonValidationErrors('to');

    $this->actingAs($membership->user)->getJson('/api/v1/appointments?from=2026-08-10&to=2026-08-01')
        ->assertStatus(422)->assertJsonValidationErrors('to');
});
