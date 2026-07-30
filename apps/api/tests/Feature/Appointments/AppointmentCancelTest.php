<?php

declare(strict_types=1);

use App\Enums\AppointmentStatus;
use App\Enums\ErrorCode;
use App\Models\Appointment;
use App\Models\Membership;
use App\Models\Organization;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('cancelling a scheduled appointment succeeds and stamps cancelled_at, cancelled_by and the reason', function () {
    $membership = Membership::factory()->create();
    $appointment = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'status' => AppointmentStatus::Scheduled,
    ]);

    $this->actingAs($membership->user)->patchJson("/api/v1/appointments/{$appointment->id}/cancel", [
        'cancellation_reason' => 'El paciente no puede asistir.',
    ])->assertSuccessful();

    $appointment->refresh();
    expect($appointment->status)->toBe(AppointmentStatus::Cancelled);
    expect($appointment->cancelled_at)->not->toBeNull();
    expect($appointment->cancelled_by)->toBe($membership->user->id);
    expect($appointment->cancellation_reason)->toBe('El paciente no puede asistir.');
});

test('cancelling a confirmed appointment succeeds', function () {
    $membership = Membership::factory()->create();
    $appointment = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'status' => AppointmentStatus::Confirmed,
    ]);

    $this->actingAs($membership->user)->patchJson("/api/v1/appointments/{$appointment->id}/cancel", [
        'cancellation_reason' => null,
    ])->assertSuccessful();

    expect($appointment->fresh()->status)->toBe(AppointmentStatus::Cancelled);
});

test('cancelling an arrived appointment succeeds', function () {
    $membership = Membership::factory()->create();
    $appointment = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'status' => AppointmentStatus::Arrived,
    ]);

    $this->actingAs($membership->user)->patchJson("/api/v1/appointments/{$appointment->id}/cancel", [
        'cancellation_reason' => null,
    ])->assertSuccessful();

    expect($appointment->fresh()->status)->toBe(AppointmentStatus::Cancelled);
});

test('cancelling with no cancellation_reason in the payload leaves it null', function () {
    $membership = Membership::factory()->create();
    $appointment = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'status' => AppointmentStatus::Scheduled,
    ]);

    $this->actingAs($membership->user)->patchJson("/api/v1/appointments/{$appointment->id}/cancel", [])
        ->assertSuccessful();

    $appointment->refresh();
    expect($appointment->status)->toBe(AppointmentStatus::Cancelled);
    expect($appointment->cancellation_reason)->toBeNull();
});

test('cancelling from a terminal status returns 409 with the not-cancellable domain error and leaves the status unchanged', function (AppointmentStatus $status) {
    $membership = Membership::factory()->create();
    $appointment = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'status' => $status,
    ]);

    $this->actingAs($membership->user)->patchJson("/api/v1/appointments/{$appointment->id}/cancel", [])
        ->assertStatus(409)
        ->assertJsonPath('error.code', ErrorCode::AppointmentsNotCancellableFromStatus->value);

    expect($appointment->fresh()->status)->toBe($status);
})->with([
    'completed' => AppointmentStatus::Completed,
    'no_show' => AppointmentStatus::NoShow,
    'cancelled' => AppointmentStatus::Cancelled,
    'rescheduled' => AppointmentStatus::Rescheduled,
]);

test('cancelling an appointment belonging to another organization is rejected', function () {
    $membership = Membership::factory()->create();
    $otherMembership = Membership::factory()->create();
    $appointment = Appointment::factory()->create([
        'organization_id' => $otherMembership->organization_id,
        'membership_id' => $otherMembership->id,
        'status' => AppointmentStatus::Scheduled,
    ]);

    $response = $this->actingAs($membership->user)->patchJson("/api/v1/appointments/{$appointment->id}/cancel", []);

    $response->assertStatus(403);
    expect($appointment->fresh()->status)->toBe(AppointmentStatus::Scheduled);
});

test('a membership holding only appointments.update.own gets 403 cancelling another professional\'s appointment, 2xx on its own', function () {
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

    $this->actingAs($professional->user)->patchJson("/api/v1/appointments/{$anotherAppointment->id}/cancel", [])
        ->assertStatus(403);

    $this->actingAs($professional->user)->patchJson("/api/v1/appointments/{$ownAppointment->id}/cancel", [])
        ->assertSuccessful();
});

test('a guest gets 401 cancelling an appointment', function () {
    $membership = Membership::factory()->create();
    $appointment = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'status' => AppointmentStatus::Scheduled,
    ]);

    $this->patchJson("/api/v1/appointments/{$appointment->id}/cancel", [])
        ->assertStatus(401);
});
