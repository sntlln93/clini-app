<?php

declare(strict_types=1);

use App\Enums\AppointmentStatus;
use App\Enums\ReminderStatus;
use App\Jobs\Appointments\SendAppointmentReminderJob;
use App\Mail\Appointments\AppointmentReminderMail;
use App\Models\Appointment;
use App\Models\Patient;
use App\Models\Reminder;
use Illuminate\Support\Facades\Mail;

test('a queued reminder for an active appointment is sent and marked sent', function () {
    Mail::fake();

    $patient = Patient::factory()->create(['email' => 'patient@example.com']);
    $appointment = Appointment::factory()->create([
        'patient_id' => $patient->id,
        'status' => AppointmentStatus::Scheduled,
    ]);
    $reminder = Reminder::factory()->create([
        'organization_id' => $appointment->organization_id,
        'appointment_id' => $appointment->id,
        'status' => ReminderStatus::Queued,
    ]);

    (new SendAppointmentReminderJob($reminder))->handle();

    Mail::assertSent(AppointmentReminderMail::class, fn (AppointmentReminderMail $mailable) => $mailable->hasTo('patient@example.com'));

    $reminder->refresh();
    expect($reminder->status)->toBe(ReminderStatus::Sent);
    expect($reminder->sent_at)->not->toBeNull();
});

test('a queued reminder whose appointment is no longer active is deleted without sending', function (AppointmentStatus $status) {
    Mail::fake();

    $patient = Patient::factory()->create(['email' => 'patient@example.com']);
    $appointment = Appointment::factory()->create([
        'patient_id' => $patient->id,
        'status' => $status,
    ]);
    $reminder = Reminder::factory()->create([
        'organization_id' => $appointment->organization_id,
        'appointment_id' => $appointment->id,
        'status' => ReminderStatus::Queued,
    ]);

    (new SendAppointmentReminderJob($reminder))->handle();

    Mail::assertNothingSent();
    expect(Reminder::query()->find($reminder->id))->toBeNull();
})->with([
    'cancelled' => AppointmentStatus::Cancelled,
    'rescheduled' => AppointmentStatus::Rescheduled,
]);

test('a reminder already marked sent is not sent again', function () {
    Mail::fake();

    $patient = Patient::factory()->create(['email' => 'patient@example.com']);
    $appointment = Appointment::factory()->create([
        'patient_id' => $patient->id,
        'status' => AppointmentStatus::Scheduled,
    ]);
    $sentAt = now()->subDay();
    $reminder = Reminder::factory()->create([
        'organization_id' => $appointment->organization_id,
        'appointment_id' => $appointment->id,
        'status' => ReminderStatus::Sent,
        'sent_at' => $sentAt,
    ]);

    (new SendAppointmentReminderJob($reminder))->handle();

    Mail::assertNothingSent();
    expect($reminder->fresh()->sent_at->format('Y-m-d H:i:s'))->toBe($sentAt->format('Y-m-d H:i:s'));
});

test('a failing send propagates and leaves the reminder queued', function () {
    $patient = Patient::factory()->create(['email' => 'patient@example.com']);
    $appointment = Appointment::factory()->create([
        'patient_id' => $patient->id,
        'status' => AppointmentStatus::Scheduled,
    ]);
    $reminder = Reminder::factory()->create([
        'organization_id' => $appointment->organization_id,
        'appointment_id' => $appointment->id,
        'status' => ReminderStatus::Queued,
    ]);

    $pending = Mockery::mock();
    $pending->shouldReceive('send')->once()->andThrow(new RuntimeException('smtp down'));
    Mail::shouldReceive('to')->once()->with('patient@example.com')->andReturn($pending);

    expect(fn () => (new SendAppointmentReminderJob($reminder))->handle())->toThrow(RuntimeException::class, 'smtp down');

    $reminder->refresh();
    expect($reminder->status)->toBe(ReminderStatus::Queued);
    expect($reminder->sent_at)->toBeNull();
});

test('failed() marks the reminder failed', function () {
    $patient = Patient::factory()->create(['email' => 'patient@example.com']);
    $appointment = Appointment::factory()->create([
        'patient_id' => $patient->id,
        'status' => AppointmentStatus::Scheduled,
    ]);
    $reminder = Reminder::factory()->create([
        'organization_id' => $appointment->organization_id,
        'appointment_id' => $appointment->id,
        'status' => ReminderStatus::Queued,
    ]);

    $job = new SendAppointmentReminderJob($reminder);
    $job->failed(new RuntimeException('smtp down'));

    $reminder->refresh();
    expect($reminder->status)->toBe(ReminderStatus::Failed);
    expect($reminder->sent_at)->toBeNull();
});
