<?php

declare(strict_types=1);

use App\Enums\AppointmentStatus;
use App\Models\Appointment;
use App\Models\Membership;
use App\Models\Organization;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('scheduled to confirmed succeeds and stamps confirmed_at', function () {
    $membership = Membership::factory()->create();
    $appointment = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'status' => AppointmentStatus::Scheduled,
    ]);

    $this->actingAs($membership->user)->patchJson("/api/v1/appointments/{$appointment->id}/status", [
        'status' => 'confirmed',
    ])->assertSuccessful();

    $appointment->refresh();
    expect($appointment->status)->toBe(AppointmentStatus::Confirmed);
    expect($appointment->confirmed_at)->not->toBeNull();
});

test('confirmed to arrived succeeds and stamps arrived_at', function () {
    $membership = Membership::factory()->create();
    $appointment = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'status' => AppointmentStatus::Confirmed,
        'confirmed_at' => now(),
    ]);

    $this->actingAs($membership->user)->patchJson("/api/v1/appointments/{$appointment->id}/status", [
        'status' => 'arrived',
    ])->assertSuccessful();

    $appointment->refresh();
    expect($appointment->status)->toBe(AppointmentStatus::Arrived);
    expect($appointment->arrived_at)->not->toBeNull();
});

test('arrived to completed succeeds and stamps completed_at', function () {
    $membership = Membership::factory()->create();
    $appointment = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'status' => AppointmentStatus::Arrived,
    ]);

    $this->actingAs($membership->user)->patchJson("/api/v1/appointments/{$appointment->id}/status", [
        'status' => 'completed',
    ])->assertSuccessful();

    $appointment->refresh();
    expect($appointment->status)->toBe(AppointmentStatus::Completed);
    expect($appointment->completed_at)->not->toBeNull();
});

test('scheduled and confirmed both transition successfully to no_show', function () {
    $membership = Membership::factory()->create();
    $scheduled = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'status' => AppointmentStatus::Scheduled,
    ]);
    $confirmed = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'status' => AppointmentStatus::Confirmed,
    ]);

    $this->actingAs($membership->user)->patchJson("/api/v1/appointments/{$scheduled->id}/status", [
        'status' => 'no_show',
    ])->assertSuccessful();
    $this->actingAs($membership->user)->patchJson("/api/v1/appointments/{$confirmed->id}/status", [
        'status' => 'no_show',
    ])->assertSuccessful();

    expect($scheduled->fresh()->status)->toBe(AppointmentStatus::NoShow);
    expect($confirmed->fresh()->status)->toBe(AppointmentStatus::NoShow);
});

test('invalid transitions return 422 and leave the status unchanged', function () {
    $membership = Membership::factory()->create();
    $scheduled = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'status' => AppointmentStatus::Scheduled,
    ]);
    $arrived = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'status' => AppointmentStatus::Arrived,
    ]);
    $completed = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'status' => AppointmentStatus::Completed,
    ]);

    $this->actingAs($membership->user)->patchJson("/api/v1/appointments/{$scheduled->id}/status", [
        'status' => 'completed',
    ])->assertStatus(422);
    expect($scheduled->fresh()->status)->toBe(AppointmentStatus::Scheduled);

    $this->actingAs($membership->user)->patchJson("/api/v1/appointments/{$arrived->id}/status", [
        'status' => 'confirmed',
    ])->assertStatus(422);
    expect($arrived->fresh()->status)->toBe(AppointmentStatus::Arrived);

    $this->actingAs($membership->user)->patchJson("/api/v1/appointments/{$completed->id}/status", [
        'status' => 'scheduled',
    ])->assertStatus(422);
    expect($completed->fresh()->status)->toBe(AppointmentStatus::Completed);
});

test('a status transition on an appointment belonging to another organization is rejected', function () {
    $membership = Membership::factory()->create();
    $otherMembership = Membership::factory()->create();
    $appointment = Appointment::factory()->create([
        'organization_id' => $otherMembership->organization_id,
        'membership_id' => $otherMembership->id,
        'status' => AppointmentStatus::Scheduled,
    ]);

    $response = $this->actingAs($membership->user)->patchJson("/api/v1/appointments/{$appointment->id}/status", [
        'status' => 'confirmed',
    ]);

    $response->assertStatus(403);
    expect($appointment->fresh()->status)->toBe(AppointmentStatus::Scheduled);
});

test('a membership holding only appointments.update.own gets 403 transitioning another professional\'s appointment, 2xx on its own', function () {
    $organization = Organization::factory()->create();
    $professional = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $another = Membership::factory()->create(['organization_id' => $organization->id]);

    $ownAppointment = Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $professional->id,
        'status' => AppointmentStatus::Scheduled,
    ]);
    $anotherAppointment = Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $another->id,
        'status' => AppointmentStatus::Scheduled,
    ]);

    $this->actingAs($professional->user)->patchJson("/api/v1/appointments/{$anotherAppointment->id}/status", [
        'status' => 'confirmed',
    ])->assertStatus(403);

    $this->actingAs($professional->user)->patchJson("/api/v1/appointments/{$ownAppointment->id}/status", [
        'status' => 'confirmed',
    ])->assertSuccessful();
});
