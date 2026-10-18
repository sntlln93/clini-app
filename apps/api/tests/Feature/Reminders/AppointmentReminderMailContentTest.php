<?php

declare(strict_types=1);

use App\Mail\Appointments\AppointmentReminderMail;
use App\Models\Appointment;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Patient;
use App\Models\Service;
use App\Models\User;
use App\Support\AppointmentCalendarEvent;
use App\Support\AppointmentDetailsLink;
use App\Support\CalendarLink;

/**
 * #320: the reminder goes through a mail provider abroad, and the professional
 * and service can reveal the specialty (a health data point, Ley 25.326 art. 2).
 */
function reminderAppointment(): Appointment
{
    $organization = Organization::factory()->create([
        'name' => 'Consultorio Salud',
        'timezone' => 'America/Argentina/Buenos_Aires',
    ]);
    $membership = Membership::factory()->create([
        'organization_id' => $organization->id,
        'user_id' => User::factory()->create(['name' => 'Ana Gómez'])->id,
    ]);

    return Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'patient_id' => Patient::factory()->create(['name' => 'Juan Pérez'])->id,
        'service_id' => Service::factory()->create(['name' => 'Psicoterapia'])->id,
        'start_at' => '2026-08-03 13:00:00',
        'end_at' => '2026-08-03 13:45:00',
    ]);
}

test('the reminder names neither the professional, the service nor the patient', function () {
    $mail = new AppointmentReminderMail(reminderAppointment());

    $mail->assertDontSeeInHtml('Ana Gómez')
        ->assertDontSeeInHtml('Psicoterapia')
        ->assertDontSeeInHtml('Juan Pérez')
        ->assertDontSeeInHtml('Profesional')
        ->assertDontSeeInHtml('Servicio');
});

test('the reminder states the practice, the day and the time in the practice timezone', function () {
    $mail = new AppointmentReminderMail(reminderAppointment());

    $mail->assertSeeInHtml('Tu turno en <strong>Consultorio Salud</strong> es el <strong>lunes 3 de agosto a las 10:00</strong>.', false);
});

test('the reminder links to the page with the appointment details', function () {
    $this->travelTo('2026-08-02 13:00:00');
    $appointment = reminderAppointment();

    $html = (new AppointmentReminderMail($appointment))->render();

    $panelUrl = rtrim((string) config('cors.allowed_origins')[0], '/');
    expect($html)->toContain('Ver los detalles del turno')
        ->toMatch('#href="'.preg_quote($panelUrl, '#').'/turno/[A-Za-z0-9_-]{40,}"#');
    preg_match('#/turno/([A-Za-z0-9_-]+)"#', $html, $match);
    expect(app(AppointmentDetailsLink::class)->appointmentOf($match[1])->is($appointment))->toBeTrue();
});

test('the calendar link and the .ics carry neither the professional nor the service', function () {
    $appointment = reminderAppointment();
    $event = app(AppointmentCalendarEvent::class)->of($appointment);

    $mail = new AppointmentReminderMail($appointment);

    $google = urldecode(CalendarLink::google($event));
    $ics = CalendarLink::ics($event, now());
    expect($google)->not->toContain('Ana Gómez')->not->toContain('Psicoterapia')
        ->and($ics)->not->toContain('Ana Gómez')->not->toContain('Psicoterapia');
    $mail->assertHasAttachedData($ics, 'turno.ics', ['mime' => 'text/calendar; charset=utf-8; method=PUBLISH']);
});
