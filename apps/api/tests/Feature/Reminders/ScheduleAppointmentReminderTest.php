<?php

declare(strict_types=1);

use App\Enums\AppointmentStatus;
use App\Enums\ErrorCode;
use App\Enums\ReminderChannel;
use App\Enums\ReminderStatus;
use App\Models\Appointment;
use App\Models\Membership;
use App\Models\Patient;
use App\Models\ProfessionalService;
use App\Models\Reminder;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('booking for a patient with an email schedules exactly one pending email reminder 12 hours before start_at', function () {
    $membership = Membership::factory()->create();
    $professionalService = ProfessionalService::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);
    $patient = Patient::factory()->create(['email' => 'patient@example.com']);

    $response = $this->actingAs($membership->user)->postJson('/api/v1/appointments', [
        'membership_id' => $membership->id,
        'patient_id' => $patient->id,
        'service_id' => $professionalService->service_id,
        'start_at' => now()->addDays(2)->toIso8601String(),
    ]);

    $response->assertCreated();
    $appointment = Appointment::findOrFail($response->json('data.id'));

    expect(Reminder::query()->count())->toBe(1);

    $reminder = Reminder::query()->sole();
    expect($reminder->appointment_id)->toBe($appointment->id);
    expect($reminder->organization_id)->toBe($appointment->organization_id);
    expect($reminder->channel)->toBe(ReminderChannel::Email);
    expect($reminder->status)->toBe(ReminderStatus::Pending);
    expect($reminder->scheduled_at->equalTo($appointment->start_at->clone()->subHours(12)))->toBeTrue();
});

test('booking for a patient without an email creates no reminder', function () {
    $membership = Membership::factory()->create();
    $professionalService = ProfessionalService::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);
    $patient = Patient::factory()->create(['email' => null]);

    $this->actingAs($membership->user)->postJson('/api/v1/appointments', [
        'membership_id' => $membership->id,
        'patient_id' => $patient->id,
        'service_id' => $professionalService->service_id,
        'start_at' => now()->addDays(2)->toIso8601String(),
    ])->assertCreated();

    expect(Reminder::query()->count())->toBe(0);
});

test('booking an appointment starting in less than 12 hours creates no reminder', function () {
    $membership = Membership::factory()->create();
    $professionalService = ProfessionalService::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);
    $patient = Patient::factory()->create(['email' => 'patient@example.com']);

    $this->actingAs($membership->user)->postJson('/api/v1/appointments', [
        'membership_id' => $membership->id,
        'patient_id' => $patient->id,
        'service_id' => $professionalService->service_id,
        'start_at' => now()->addHours(3)->toIso8601String(),
    ])->assertCreated();

    expect(Reminder::query()->count())->toBe(0);
});

test('booking an appointment starting just over 12 hours away creates a reminder', function () {
    $membership = Membership::factory()->create();
    $professionalService = ProfessionalService::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);
    $patient = Patient::factory()->create(['email' => 'patient@example.com']);

    $this->actingAs($membership->user)->postJson('/api/v1/appointments', [
        'membership_id' => $membership->id,
        'patient_id' => $patient->id,
        'service_id' => $professionalService->service_id,
        'start_at' => now()->addHours(12)->addMinutes(5)->toIso8601String(),
    ])->assertCreated();

    expect(Reminder::query()->count())->toBe(1);
});

test('rescheduling an appointment schedules a reminder for the new appointment', function () {
    $membership = Membership::factory()->create();
    $professionalService = ProfessionalService::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'duration_minutes' => 30,
    ]);
    $patient = Patient::factory()->create(['email' => 'patient@example.com']);
    $original = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'patient_id' => $patient->id,
        'service_id' => $professionalService->service_id,
        'status' => AppointmentStatus::Scheduled,
        'start_at' => now()->addDay(),
        'end_at' => now()->addDay()->addMinutes(30),
    ]);

    $response = $this->actingAs($membership->user)->postJson("/api/v1/appointments/{$original->id}/reschedule", [
        'start_at' => now()->addDays(3)->toIso8601String(),
    ]);

    $response->assertCreated();
    $newAppointment = Appointment::findOrFail($response->json('data.id'));

    $reminder = Reminder::query()->where('appointment_id', $newAppointment->id)->sole();
    expect($reminder->status)->toBe(ReminderStatus::Pending);
    expect($reminder->scheduled_at->equalTo($newAppointment->start_at->clone()->subHours(12)))->toBeTrue();
});

test('booking that fails on the overlap check leaves no reminder behind', function () {
    $membership = Membership::factory()->create();
    $professionalService = ProfessionalService::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'duration_minutes' => 30,
    ]);
    $existingStart = now()->addDays(2);
    Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'service_id' => $professionalService->service_id,
        'status' => AppointmentStatus::Scheduled,
        'start_at' => $existingStart,
        'end_at' => $existingStart->clone()->addMinutes(30),
    ]);
    $patient = Patient::factory()->create(['email' => 'patient@example.com']);

    $this->actingAs($membership->user)->postJson('/api/v1/appointments', [
        'membership_id' => $membership->id,
        'patient_id' => $patient->id,
        'service_id' => $professionalService->service_id,
        'start_at' => $existingStart->clone()->addMinutes(15)->toIso8601String(),
    ])
        ->assertStatus(409)
        ->assertJsonPath('error.code', ErrorCode::AppointmentsSlotTaken->value);

    expect(Reminder::query()->count())->toBe(0);
});
