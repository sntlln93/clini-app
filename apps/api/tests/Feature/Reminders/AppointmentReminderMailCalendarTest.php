<?php

declare(strict_types=1);

use App\Mail\Appointments\AppointmentReminderMail;
use App\Models\Appointment;
use App\Models\Organization;
use App\Support\AppointmentCalendarEvent;
use App\Support\CalendarLink;

test('the reminder links the appointment to Google Calendar', function () {
    $organization = Organization::factory()->create(['name' => 'Consultorio Salud']);
    $appointment = Appointment::factory()->create([
        'organization_id' => $organization->id,
        'start_at' => '2026-08-03 13:00:00',
        'end_at' => '2026-08-03 13:45:00',
    ]);

    $mail = new AppointmentReminderMail($appointment);

    $mail->assertSeeInHtml('Agregar a Google Calendar')
        ->assertSeeInHtml(e('https://calendar.google.com/calendar/render?action=TEMPLATE&text=Turno%20en%20Consultorio%20Salud&dates=20260803T130000Z%2F20260803T134500Z'), false);
});

test('the reminder attaches the appointment as an .ics file', function () {
    $this->travelTo('2026-08-02 13:00:00');
    $appointment = Appointment::factory()->create([
        'start_at' => '2026-08-03 13:00:00',
        'end_at' => '2026-08-03 13:45:00',
    ]);

    $mail = new AppointmentReminderMail($appointment);

    $mail->assertHasAttachedData(
        CalendarLink::ics(app(AppointmentCalendarEvent::class)->of($appointment), now()),
        'turno.ics',
        ['mime' => 'text/calendar; charset=utf-8; method=PUBLISH'],
    );
});
