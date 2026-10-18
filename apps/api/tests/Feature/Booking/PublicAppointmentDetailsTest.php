<?php

declare(strict_types=1);

use App\Enums\AppointmentStatus;
use App\Enums\ErrorCode;
use App\Models\Appointment;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Patient;
use App\Models\Service;
use App\Models\User;
use App\Support\AppointmentCalendarEvent;
use App\Support\AppointmentDetailsLink;
use App\Support\CurrentOrganization;
use Illuminate\Support\Facades\Crypt;

/**
 * #320: the page the reminder links to, with the details the mail no longer
 * carries. Public, so the link itself is the only credential.
 */
function detailsAppointment(array $attributes = []): Appointment
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
        'patient_id' => Patient::factory()->create(['name' => 'Juan Pérez', 'email' => 'juan@example.com'])->id,
        'service_id' => Service::factory()->create(['name' => 'Psicoterapia'])->id,
        'start_at' => now()->addDay(),
        'end_at' => now()->addDay()->addMinutes(45),
        ...$attributes,
    ]);
}

function detailsTokenOf(Appointment $appointment): string
{
    return app(AppointmentDetailsLink::class)->tokenOf($appointment);
}

test('the link shows the appointment details to an anonymous visitor', function () {
    $this->travelTo('2026-08-02 13:00:00');
    $appointment = detailsAppointment();

    $response = $this->getJson('/api/v1/booking/appointments/'.detailsTokenOf($appointment));

    $response->assertOk()
        ->assertJsonPath('organization.name', 'Consultorio Salud')
        ->assertJsonPath('organization.timezone', 'America/Argentina/Buenos_Aires')
        ->assertJsonPath('appointment.professional_name', 'Ana Gómez')
        ->assertJsonPath('appointment.service_name', 'Psicoterapia')
        ->assertJsonPath('appointment.calendar_uid', app(AppointmentCalendarEvent::class)->uidOf($appointment));
    expect($response->json('appointment.start_at'))->toBe('2026-08-03T13:00:00.000000Z');
});

test('the details never include the patient', function () {
    $appointment = detailsAppointment();

    $response = $this->getJson('/api/v1/booking/appointments/'.detailsTokenOf($appointment));

    $response->assertOk();
    expect($response->getContent())->not->toContain('Juan Pérez')->not->toContain('juan@example.com');
});

test('the token is opaque: an encrypted payload, not the appointment id', function () {
    $appointment = detailsAppointment();

    $token = detailsTokenOf($appointment);

    $payload = json_decode((string) base64_decode(strtr($token, '-_', '+/'), true), true);
    expect($token)->toMatch('/^[A-Za-z0-9_-]{40,}$/')
        ->and($payload)->toHaveKeys(['iv', 'value', 'mac'])
        ->and(json_encode($payload))->not->toContain('appointment-details');
});

test('a suspended organization shows nothing, like its booking page', function () {
    $appointment = detailsAppointment();
    $appointment->organization->forceFill(['suspended_at' => now()])->save();

    $this->getJson('/api/v1/booking/appointments/'.detailsTokenOf($appointment))
        ->assertNotFound()
        ->assertJsonPath('error.code', ErrorCode::BookingAppointmentUnavailable->value);
});

test('a tampered or unknown token is answered like an unavailable appointment', function (string $token) {
    $this->getJson("/api/v1/booking/appointments/{$token}")
        ->assertNotFound()
        ->assertJsonPath('error.code', ErrorCode::BookingAppointmentUnavailable->value);
})->with([
    'random' => [str_repeat('a', 64)],
    'flipped' => [fn () => strrev(detailsTokenOf(detailsAppointment()))],
]);

test('a token encrypted for another purpose is rejected', function () {
    $appointment = detailsAppointment();
    $token = rtrim(strtr(base64_encode((string) base64_decode(Crypt::encryptString((string) $appointment->id))), '+/', '-_'), '=');

    $this->getJson("/api/v1/booking/appointments/{$token}")
        ->assertNotFound()
        ->assertJsonPath('error.code', ErrorCode::BookingAppointmentUnavailable->value);
});

test('a cancelled or rescheduled appointment shows nothing', function (AppointmentStatus $status) {
    $appointment = detailsAppointment(['status' => $status]);

    $this->getJson('/api/v1/booking/appointments/'.detailsTokenOf($appointment))
        ->assertNotFound()
        ->assertJsonPath('error.code', ErrorCode::BookingAppointmentUnavailable->value)
        ->assertJsonMissingPath('appointment');
})->with([AppointmentStatus::Cancelled, AppointmentStatus::Rescheduled]);

test('the link stops working once the appointment ends', function () {
    $appointment = detailsAppointment();
    $token = detailsTokenOf($appointment);

    $this->travelTo($appointment->end_at);

    $this->getJson("/api/v1/booking/appointments/{$token}")
        ->assertNotFound()
        ->assertJsonPath('error.code', ErrorCode::BookingAppointmentUnavailable->value);
});

test('the lookup ignores the tenant scope a previous request left set', function () {
    $appointment = detailsAppointment();
    app(CurrentOrganization::class)->set(Organization::factory()->create()->id);

    $this->getJson('/api/v1/booking/appointments/'.detailsTokenOf($appointment))
        ->assertOk()
        ->assertJsonPath('appointment.professional_name', 'Ana Gómez');
});
