<?php

declare(strict_types=1);

use App\Enums\AppointmentStatus;
use App\Enums\ReminderStatus;
use App\Jobs\Appointments\SendAppointmentReminderJob;
use App\Models\Appointment;
use App\Models\Patient;
use App\Models\Reminder;
use Illuminate\Support\Facades\Queue;

test('a due pending reminder is marked queued and dispatches the send job', function () {
    Queue::fake();

    $patient = Patient::factory()->create(['email' => 'patient@example.com']);
    $appointment = Appointment::factory()->create([
        'patient_id' => $patient->id,
        'status' => AppointmentStatus::Scheduled,
    ]);
    $reminder = Reminder::factory()->create([
        'organization_id' => $appointment->organization_id,
        'appointment_id' => $appointment->id,
        'status' => ReminderStatus::Pending,
        'scheduled_at' => now()->subMinute(),
    ]);

    $this->artisan('reminders:send-due')->assertSuccessful();

    Queue::assertPushed(SendAppointmentReminderJob::class, fn (SendAppointmentReminderJob $job) => $job->reminder->is($reminder));

    $reminder->refresh();
    expect($reminder->status)->toBe(ReminderStatus::Queued);
    expect($reminder->sent_at)->toBeNull();
});

test('a pending reminder scheduled in the future is left untouched', function () {
    Queue::fake();

    $patient = Patient::factory()->create(['email' => 'patient@example.com']);
    $appointment = Appointment::factory()->create([
        'patient_id' => $patient->id,
        'status' => AppointmentStatus::Scheduled,
    ]);
    $reminder = Reminder::factory()->create([
        'organization_id' => $appointment->organization_id,
        'appointment_id' => $appointment->id,
        'status' => ReminderStatus::Pending,
        'scheduled_at' => now()->addHour(),
    ]);

    $this->artisan('reminders:send-due')->assertSuccessful();

    Queue::assertNotPushed(SendAppointmentReminderJob::class);
    expect($reminder->fresh()->status)->toBe(ReminderStatus::Pending);
});

test('a reminder already queued, sent or failed is never reprocessed', function (ReminderStatus $status) {
    Queue::fake();

    $patient = Patient::factory()->create(['email' => 'patient@example.com']);
    $appointment = Appointment::factory()->create([
        'patient_id' => $patient->id,
        'status' => AppointmentStatus::Scheduled,
    ]);
    $sentAt = $status === ReminderStatus::Sent ? now()->subDay() : null;
    $reminder = Reminder::factory()->create([
        'organization_id' => $appointment->organization_id,
        'appointment_id' => $appointment->id,
        'status' => $status,
        'scheduled_at' => now()->subHour(),
        'sent_at' => $sentAt,
    ]);

    $this->artisan('reminders:send-due')->assertSuccessful();

    Queue::assertNotPushed(SendAppointmentReminderJob::class);
    expect($reminder->fresh()->status)->toBe($status);

    if ($status === ReminderStatus::Sent) {
        expect($reminder->fresh()->sent_at->format('Y-m-d H:i:s'))->toBe($sentAt->format('Y-m-d H:i:s'));
    } else {
        expect($reminder->fresh()->sent_at)->toBeNull();
    }
})->with([
    'queued' => ReminderStatus::Queued,
    'sent' => ReminderStatus::Sent,
    'failed' => ReminderStatus::Failed,
]);

test('a due reminder whose appointment is no longer active is deleted without dispatching a job', function (AppointmentStatus $status) {
    Queue::fake();

    $patient = Patient::factory()->create(['email' => 'patient@example.com']);
    $appointment = Appointment::factory()->create([
        'patient_id' => $patient->id,
        'status' => $status,
    ]);
    $reminder = Reminder::factory()->create([
        'organization_id' => $appointment->organization_id,
        'appointment_id' => $appointment->id,
        'status' => ReminderStatus::Pending,
        'scheduled_at' => now()->subHour(),
    ]);

    $this->artisan('reminders:send-due')->assertSuccessful();

    Queue::assertNotPushed(SendAppointmentReminderJob::class);
    expect(Reminder::query()->find($reminder->id))->toBeNull();
})->with([
    'cancelled' => AppointmentStatus::Cancelled,
    'rescheduled' => AppointmentStatus::Rescheduled,
]);

test('the command processes due reminders across different organizations in a single run', function () {
    Queue::fake();

    $patientA = Patient::factory()->create(['email' => 'org-a@example.com']);
    $appointmentA = Appointment::factory()->create([
        'patient_id' => $patientA->id,
        'status' => AppointmentStatus::Scheduled,
    ]);
    $reminderA = Reminder::factory()->create([
        'organization_id' => $appointmentA->organization_id,
        'appointment_id' => $appointmentA->id,
        'status' => ReminderStatus::Pending,
        'scheduled_at' => now()->subHour(),
    ]);

    $patientB = Patient::factory()->create(['email' => 'org-b@example.com']);
    $appointmentB = Appointment::factory()->create([
        'patient_id' => $patientB->id,
        'status' => AppointmentStatus::Scheduled,
    ]);
    $reminderB = Reminder::factory()->create([
        'organization_id' => $appointmentB->organization_id,
        'appointment_id' => $appointmentB->id,
        'status' => ReminderStatus::Pending,
        'scheduled_at' => now()->subHour(),
    ]);

    expect($appointmentA->organization_id)->not->toBe($appointmentB->organization_id);

    $this->artisan('reminders:send-due')->assertSuccessful();

    Queue::assertPushed(SendAppointmentReminderJob::class, fn (SendAppointmentReminderJob $job) => $job->reminder->is($reminderA));
    Queue::assertPushed(SendAppointmentReminderJob::class, fn (SendAppointmentReminderJob $job) => $job->reminder->is($reminderB));
    Queue::assertPushed(SendAppointmentReminderJob::class, 2);

    expect($reminderA->fresh()->status)->toBe(ReminderStatus::Queued);
    expect($reminderB->fresh()->status)->toBe(ReminderStatus::Queued);
});
