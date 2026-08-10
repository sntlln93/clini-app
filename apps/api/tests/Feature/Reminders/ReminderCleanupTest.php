<?php

declare(strict_types=1);

use App\Enums\AppointmentStatus;
use App\Enums\ReminderStatus;
use App\Models\Appointment;
use App\Models\Membership;
use App\Models\ProfessionalService;
use App\Models\Reminder;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('cancelling an appointment deletes its pending reminders', function () {
    $membership = Membership::factory()->create();
    $appointment = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'status' => AppointmentStatus::Scheduled,
    ]);
    $reminder = Reminder::factory()->create([
        'organization_id' => $appointment->organization_id,
        'appointment_id' => $appointment->id,
        'status' => ReminderStatus::Pending,
    ]);

    $this->actingAs($membership->user)->patchJson("/api/v1/appointments/{$appointment->id}/cancel", [])
        ->assertSuccessful();

    expect(Reminder::query()->find($reminder->id))->toBeNull();
});

test('cancelling an appointment deletes its queued reminders', function () {
    $membership = Membership::factory()->create();
    $appointment = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'status' => AppointmentStatus::Scheduled,
    ]);
    $reminder = Reminder::factory()->create([
        'organization_id' => $appointment->organization_id,
        'appointment_id' => $appointment->id,
        'status' => ReminderStatus::Queued,
    ]);

    $this->actingAs($membership->user)->patchJson("/api/v1/appointments/{$appointment->id}/cancel", [])
        ->assertSuccessful();

    expect(Reminder::query()->find($reminder->id))->toBeNull();
});

test('cancelling does not delete reminders that are already sent or failed', function (ReminderStatus $status) {
    $membership = Membership::factory()->create();
    $appointment = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'status' => AppointmentStatus::Scheduled,
    ]);
    $reminder = Reminder::factory()->create([
        'organization_id' => $appointment->organization_id,
        'appointment_id' => $appointment->id,
        'status' => $status,
    ]);

    $this->actingAs($membership->user)->patchJson("/api/v1/appointments/{$appointment->id}/cancel", [])
        ->assertSuccessful();

    $reminder->refresh();
    expect($reminder)->not->toBeNull();
    expect($reminder->status)->toBe($status);
})->with([
    'sent' => ReminderStatus::Sent,
    'failed' => ReminderStatus::Failed,
]);

test('rescheduling deletes the original appointment pending reminder', function () {
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
        'start_at' => now()->addDays(2),
        'end_at' => now()->addDays(2)->addMinutes(30),
    ]);
    $reminder = Reminder::factory()->create([
        'organization_id' => $original->organization_id,
        'appointment_id' => $original->id,
        'status' => ReminderStatus::Pending,
    ]);

    $this->actingAs($membership->user)->postJson("/api/v1/appointments/{$original->id}/reschedule", [
        'start_at' => now()->addDays(3)->toIso8601String(),
    ])->assertCreated();

    expect(Reminder::query()->find($reminder->id))->toBeNull();
});

test('rescheduling deletes the original appointment queued reminder', function () {
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
        'start_at' => now()->addDays(2),
        'end_at' => now()->addDays(2)->addMinutes(30),
    ]);
    $reminder = Reminder::factory()->create([
        'organization_id' => $original->organization_id,
        'appointment_id' => $original->id,
        'status' => ReminderStatus::Queued,
    ]);

    $this->actingAs($membership->user)->postJson("/api/v1/appointments/{$original->id}/reschedule", [
        'start_at' => now()->addDays(3)->toIso8601String(),
    ])->assertCreated();

    expect(Reminder::query()->find($reminder->id))->toBeNull();
});

test('cancelling one appointment leaves another appointment pending reminder untouched', function () {
    $membership = Membership::factory()->create();
    $appointment = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'status' => AppointmentStatus::Scheduled,
    ]);
    $otherAppointment = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'status' => AppointmentStatus::Scheduled,
    ]);
    $reminder = Reminder::factory()->create([
        'organization_id' => $appointment->organization_id,
        'appointment_id' => $appointment->id,
        'status' => ReminderStatus::Pending,
    ]);
    $otherReminder = Reminder::factory()->create([
        'organization_id' => $otherAppointment->organization_id,
        'appointment_id' => $otherAppointment->id,
        'status' => ReminderStatus::Pending,
    ]);

    $this->actingAs($membership->user)->patchJson("/api/v1/appointments/{$appointment->id}/cancel", [])
        ->assertSuccessful();

    expect(Reminder::query()->find($reminder->id))->toBeNull();

    $otherReminder->refresh();
    expect($otherReminder)->not->toBeNull();
    expect($otherReminder->status)->toBe(ReminderStatus::Pending);
});
