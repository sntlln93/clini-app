<?php

declare(strict_types=1);

use App\Enums\Province as ProvinceSlug;
use App\Mail\Appointments\AppointmentReminderMail;
use App\Models\Address;
use App\Models\Appointment;
use App\Models\City;
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

test('the reminder attaches the appointment as an .ics file, with the practice address', function () {
    $this->travelTo('2026-08-02 13:00:00');
    $organization = Organization::factory()->create(['name' => 'Consultorio Salud']);
    Address::factory()->create([
        'addressable_id' => $organization->id,
        'street' => 'Av. Pellegrini 1500',
        'city_id' => City::factory()->inProvince(ProvinceSlug::SantaFe)->create(['name' => 'Rosario'])->id,
        'country' => 'Argentina',
    ]);
    $appointment = Appointment::factory()->create([
        'organization_id' => $organization->id,
        'start_at' => '2026-08-03 13:00:00',
        'end_at' => '2026-08-03 13:45:00',
    ]);
    $uid = app(AppointmentCalendarEvent::class)->uidOf($appointment);

    $mail = new AppointmentReminderMail($appointment);

    $ics = CalendarLink::ics(app(AppointmentCalendarEvent::class)->of($appointment), now());
    expect($ics)->toContain(
        "UID:{$uid}\r\n",
        "DTSTAMP:20260802T130000Z\r\n",
        "DTSTART:20260803T130000Z\r\n",
        "DTEND:20260803T134500Z\r\n",
        "SUMMARY:Turno en Consultorio Salud\r\n",
        "LOCATION:Av. Pellegrini 1500\\, Rosario\\, Santa Fe\\, Argentina\r\n",
    );
    $mail->assertSeeInHtml(e('&location=Av.%20Pellegrini%201500%2C%20Rosario%2C%20Santa%20Fe%2C%20Argentina'), false);
    $mail->assertHasAttachedData(
        $ics,
        'turno.ics',
        ['mime' => 'text/calendar; charset=utf-8; method=PUBLISH'],
    );
});
