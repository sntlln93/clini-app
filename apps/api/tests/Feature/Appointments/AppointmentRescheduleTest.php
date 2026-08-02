<?php

declare(strict_types=1);

use App\Enums\AppointmentStatus;
use App\Enums\ErrorCode;
use App\Models\Appointment;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Patient;
use App\Models\ProfessionalService;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('reschedule response includes the professional, patient and service names of the new appointment', function () {
    $membership = Membership::factory()->create();
    $professionalService = ProfessionalService::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);
    $patient = Patient::factory()->create();
    $original = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'patient_id' => $patient->id,
        'service_id' => $professionalService->service_id,
        'status' => AppointmentStatus::Scheduled,
        'start_at' => '2026-08-03 10:00:00',
        'end_at' => '2026-08-03 10:40:00',
    ]);

    $response = $this->actingAs($membership->user)->postJson("/api/v1/appointments/{$original->id}/reschedule", [
        'start_at' => '2026-08-04T09:00:00',
    ]);

    $response->assertCreated();
    $response->assertJsonPath('data.professional_name', $membership->user->name);
    $response->assertJsonPath('data.patient_name', $patient->name);
    $response->assertJsonPath('data.service_name', $professionalService->service->name);
});

test('rescheduling a scheduled appointment creates a new row, marks the original rescheduled and copies its fields', function () {
    $membership = Membership::factory()->create();
    $professionalService = ProfessionalService::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'duration_minutes' => 40,
    ]);
    $original = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'service_id' => $professionalService->service_id,
        'status' => AppointmentStatus::Scheduled,
        'start_at' => '2026-08-03 10:00:00',
        'end_at' => '2026-08-03 10:40:00',
    ]);

    $response = $this->actingAs($membership->user)->postJson("/api/v1/appointments/{$original->id}/reschedule", [
        'start_at' => '2026-08-04T09:00:00',
    ]);

    $response->assertCreated();
    $newId = $response->json('data.id');
    expect($newId)->not->toBe($original->id);

    $new = Appointment::findOrFail($newId);

    expect($original->fresh()->status)->toBe(AppointmentStatus::Rescheduled);
    expect($new->rescheduled_from_id)->toBe($original->id);
    expect($new->patient_id)->toBe($original->patient_id);
    expect($new->service_id)->toBe($original->service_id);
    expect($new->membership_id)->toBe($original->membership_id);
    expect($new->organization_id)->toBe($original->organization_id);
    expect($new->origin)->toBe($original->origin);
    expect($new->status)->toBe(AppointmentStatus::Scheduled);
    expect($new->start_at->format('Y-m-d H:i'))->toBe('2026-08-04 09:00');
    expect($new->end_at->format('Y-m-d H:i'))->toBe('2026-08-04 09:40');
});

test('rescheduling a confirmed appointment succeeds', function () {
    $membership = Membership::factory()->create();
    $professionalService = ProfessionalService::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);
    $original = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'service_id' => $professionalService->service_id,
        'status' => AppointmentStatus::Confirmed,
    ]);

    $this->actingAs($membership->user)->postJson("/api/v1/appointments/{$original->id}/reschedule", [
        'start_at' => '2026-08-04T09:00:00',
    ])->assertCreated();

    expect($original->fresh()->status)->toBe(AppointmentStatus::Rescheduled);
});

test('rescheduling from a non-reschedulable status returns 409 with the not-reschedulable domain error and creates no new row', function (AppointmentStatus $status) {
    $membership = Membership::factory()->create();
    $professionalService = ProfessionalService::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);
    $original = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'service_id' => $professionalService->service_id,
        'status' => $status,
    ]);

    $countBefore = Appointment::count();

    $this->actingAs($membership->user)->postJson("/api/v1/appointments/{$original->id}/reschedule", [
        'start_at' => '2026-08-04T09:00:00',
    ])
        ->assertStatus(409)
        ->assertJsonPath('error.code', ErrorCode::AppointmentsNotReschedulableFromStatus->value);

    expect($original->fresh()->status)->toBe($status);
    expect(Appointment::count())->toBe($countBefore);
})->with([
    'arrived' => AppointmentStatus::Arrived,
    'completed' => AppointmentStatus::Completed,
    'no_show' => AppointmentStatus::NoShow,
    'cancelled' => AppointmentStatus::Cancelled,
    'rescheduled' => AppointmentStatus::Rescheduled,
]);

test('rescheduling to a slot overlapping the appointment\'s own original time range succeeds (ordering regression)', function () {
    $membership = Membership::factory()->create();
    $professionalService = ProfessionalService::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'duration_minutes' => 30,
    ]);
    $original = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'service_id' => $professionalService->service_id,
        'status' => AppointmentStatus::Scheduled,
        'start_at' => '2026-08-03 10:00:00',
        'end_at' => '2026-08-03 10:30:00',
    ]);

    $this->actingAs($membership->user)->postJson("/api/v1/appointments/{$original->id}/reschedule", [
        'start_at' => '2026-08-03T10:00:00',
    ])->assertCreated();

    expect($original->fresh()->status)->toBe(AppointmentStatus::Rescheduled);
});

test('rescheduling to a slot overlapping a different active appointment rolls back the whole transaction', function () {
    $membership = Membership::factory()->create();
    $professionalService = ProfessionalService::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'duration_minutes' => 30,
    ]);
    $original = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'service_id' => $professionalService->service_id,
        'status' => AppointmentStatus::Scheduled,
        'start_at' => '2026-08-03 10:00:00',
        'end_at' => '2026-08-03 10:30:00',
    ]);
    Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'service_id' => $professionalService->service_id,
        'status' => AppointmentStatus::Scheduled,
        'start_at' => '2026-08-04 09:00:00',
        'end_at' => '2026-08-04 09:30:00',
    ]);

    $countBefore = Appointment::count();

    $this->actingAs($membership->user)->postJson("/api/v1/appointments/{$original->id}/reschedule", [
        'start_at' => '2026-08-04T09:15:00',
    ])
        ->assertStatus(409)
        ->assertJsonPath('error.code', ErrorCode::AppointmentsSlotTaken->value);

    expect($original->fresh()->status)->toBe(AppointmentStatus::Scheduled);
    expect(Appointment::count())->toBe($countBefore);
});

test('rescheduling with start_at missing returns a validation error on start_at', function () {
    $membership = Membership::factory()->create();
    $original = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'status' => AppointmentStatus::Scheduled,
    ]);

    $this->actingAs($membership->user)->postJson("/api/v1/appointments/{$original->id}/reschedule", [])
        ->assertStatus(422)
        ->assertJsonValidationErrors('start_at');
});

test('reason and notes sent in the payload are used on the new appointment', function () {
    $membership = Membership::factory()->create();
    $professionalService = ProfessionalService::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);
    $original = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'service_id' => $professionalService->service_id,
        'status' => AppointmentStatus::Scheduled,
        'reason' => 'Motivo original',
        'notes' => 'Notas originales',
    ]);

    $response = $this->actingAs($membership->user)->postJson("/api/v1/appointments/{$original->id}/reschedule", [
        'start_at' => '2026-08-04T09:00:00',
        'reason' => 'Motivo nuevo',
        'notes' => 'Notas nuevas',
    ]);

    $response->assertCreated();
    $new = Appointment::findOrFail($response->json('data.id'));
    expect($new->reason)->toBe('Motivo nuevo');
    expect($new->notes)->toBe('Notas nuevas');
});

test('reason and notes omitted from the payload fall back to the original appointment\'s values', function () {
    $membership = Membership::factory()->create();
    $professionalService = ProfessionalService::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);
    $original = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'service_id' => $professionalService->service_id,
        'status' => AppointmentStatus::Scheduled,
        'reason' => 'Motivo original',
        'notes' => 'Notas originales',
    ]);

    $response = $this->actingAs($membership->user)->postJson("/api/v1/appointments/{$original->id}/reschedule", [
        'start_at' => '2026-08-04T09:00:00',
    ]);

    $response->assertCreated();
    $new = Appointment::findOrFail($response->json('data.id'));
    expect($new->reason)->toBe('Motivo original');
    expect($new->notes)->toBe('Notas originales');
});

test('rescheduling an appointment belonging to another organization is rejected', function () {
    $membership = Membership::factory()->create();
    $otherMembership = Membership::factory()->create();
    $original = Appointment::factory()->create([
        'organization_id' => $otherMembership->organization_id,
        'membership_id' => $otherMembership->id,
        'status' => AppointmentStatus::Scheduled,
    ]);

    $response = $this->actingAs($membership->user)->postJson("/api/v1/appointments/{$original->id}/reschedule", [
        'start_at' => '2026-08-04T09:00:00',
    ]);

    $response->assertStatus(403);
    expect($original->fresh()->status)->toBe(AppointmentStatus::Scheduled);
});

test('a membership holding only appointments.update.own gets 403 rescheduling another professional\'s appointment, 2xx on its own', function () {
    $organization = Organization::factory()->create();
    $professional = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $another = Membership::factory()->create(['organization_id' => $organization->id]);

    $ownProfessionalService = ProfessionalService::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $professional->id,
    ]);
    $anotherProfessionalService = ProfessionalService::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $another->id,
    ]);

    $ownAppointment = Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $professional->id,
        'service_id' => $ownProfessionalService->service_id,
        'status' => AppointmentStatus::Scheduled,
    ]);
    $anotherAppointment = Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $another->id,
        'service_id' => $anotherProfessionalService->service_id,
        'status' => AppointmentStatus::Scheduled,
    ]);

    $this->actingAs($professional->user)->postJson("/api/v1/appointments/{$anotherAppointment->id}/reschedule", [
        'start_at' => '2026-08-04T09:00:00',
    ])->assertStatus(403);

    $this->actingAs($professional->user)->postJson("/api/v1/appointments/{$ownAppointment->id}/reschedule", [
        'start_at' => '2026-08-04T09:00:00',
    ])->assertSuccessful();
});

test('a guest gets 401 rescheduling an appointment', function () {
    $membership = Membership::factory()->create();
    $original = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'status' => AppointmentStatus::Scheduled,
    ]);

    $this->postJson("/api/v1/appointments/{$original->id}/reschedule", [
        'start_at' => '2026-08-04T09:00:00',
    ])->assertStatus(401);
});
