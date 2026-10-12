<?php

declare(strict_types=1);

use App\Enums\Province as ProvinceSlug;
use App\Models\Address;
use App\Models\Appointment;
use App\Models\City;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Service;
use App\Models\User;
use App\Support\AppointmentCalendarEvent;

test('the event is titled by the practice, describes professional and service, and spans the appointment in UTC', function () {
    $organization = Organization::factory()->create(['name' => 'Consultorio Salud', 'timezone' => 'America/Argentina/Buenos_Aires']);
    $membership = Membership::factory()->create([
        'organization_id' => $organization->id,
        'user_id' => User::factory()->create(['name' => 'Ana Gómez'])->id,
    ]);
    $appointment = Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'service_id' => Service::factory()->create(['name' => 'Consulta'])->id,
        'start_at' => '2026-08-03 13:00:00',
        'end_at' => '2026-08-03 13:45:00',
    ]);

    $event = app(AppointmentCalendarEvent::class)->of($appointment);

    expect($event->title)->toBe('Turno en Consultorio Salud')
        ->and($event->description)->toBe("Profesional: Ana Gómez\nPrestación: Consulta\nSi necesitás cancelar o reprogramar el turno, comunicate con Consultorio Salud.")
        ->and($event->startAt->toIso8601ZuluString())->toBe('2026-08-03T13:00:00Z')
        ->and($event->endAt->toIso8601ZuluString())->toBe('2026-08-03T13:45:00Z')
        ->and($event->uid)->toBe("appointment-{$appointment->id}@".parse_url((string) config('app.url'), PHP_URL_HOST))
        ->and($event->location)->toBeNull();
});

test('the location is the practice primary address on one line', function () {
    $organization = Organization::factory()->create();
    Address::factory()->create([
        'addressable_id' => $organization->id,
        'street' => 'Av. Pellegrini 1500',
        'city_id' => City::factory()->inProvince(ProvinceSlug::SantaFe)->create(['name' => 'Rosario'])->id,
        'country' => 'Argentina',
    ]);

    expect(app(AppointmentCalendarEvent::class)->locationOf($organization))
        ->toBe('Av. Pellegrini 1500, Rosario, Santa Fe, Argentina');
});

test('the location skips the parts the address lacks', function () {
    $organization = Organization::factory()->create();
    Address::factory()->withoutCity()->create([
        'addressable_id' => $organization->id,
        'street' => 'Mitre 200',
        'country' => null,
    ]);

    expect(app(AppointmentCalendarEvent::class)->locationOf($organization))->toBe('Mitre 200');
});
