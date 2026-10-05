<?php

declare(strict_types=1);

use App\Enums\AppointmentOrigin;
use App\Enums\AppointmentStatus;
use App\Enums\ReminderChannel;
use App\Enums\ReminderStatus;
use App\Models\Appointment;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Patient;
use App\Models\Reminder;
use App\Models\Service;
use Carbon\CarbonImmutable;

beforeEach(function () {
    // 12:00 in Buenos Aires.
    $this->travelTo(CarbonImmutable::parse('2026-10-04 15:00:00', 'UTC'));
});

afterEach(function () {
    freshRequestState();
});

/**
 * An organization with one professional, ready to receive appointments.
 *
 * @return array{organization: Organization, scope: array<string, int>}
 */
function statsOrganization(string $name = 'Consultorio'): array
{
    $organization = Organization::factory()->create(['name' => $name]);
    $membership = Membership::factory()->professional()->create(['organization_id' => $organization->id]);

    return ['organization' => $organization, 'scope' => [
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'patient_id' => Patient::factory()->create()->id,
        'service_id' => Service::factory()->create()->id,
    ]];
}

/**
 * @param  array<string, int>  $scope
 */
function statsAppointment(array $scope, string $startAtUtc, AppointmentStatus $status = AppointmentStatus::Completed, AppointmentOrigin $origin = AppointmentOrigin::Manual): Appointment
{
    $startAt = CarbonImmutable::parse($startAtUtc, 'UTC');

    return Appointment::factory()->create($scope + [
        'start_at' => $startAt,
        'end_at' => $startAt->addMinutes(30),
        'status' => $status,
        'origin' => $origin,
    ]);
}

test('without parameters the period is the last 30 local days ending today, echoed with the timezone', function () {
    $response = actingAsAdmin()->getJson('/api/v1/admin/stats');

    $response->assertOk();
    expect($response->json('data.period'))->toBe([
        'from' => '2026-09-05',
        'to' => '2026-10-04',
        'timezone' => 'America/Argentina/Buenos_Aires',
        'organization' => null,
    ]);
    expect($response->json('data.appointments.per_day'))->toHaveCount(30);
    expect($response->json('data.patients.per_day'))->toHaveCount(30);
});

test('every breakdown carries all enum keys, even with no data, and rates are null', function () {
    $data = actingAsAdmin()->getJson('/api/v1/admin/stats')->json('data');

    expect(array_keys($data['appointments']['by_status']))->toBe(array_map(fn (AppointmentStatus $s): string => $s->value, AppointmentStatus::cases()));
    expect(array_keys($data['appointments']['by_origin']))->toBe(['online', 'manual']);
    expect(array_keys($data['reminders']['by_status']))->toBe(array_map(fn (ReminderStatus $s): string => $s->value, ReminderStatus::cases()));
    expect(array_keys($data['reminders']['by_channel']))->toBe(array_map(fn (ReminderChannel $c): string => $c->value, ReminderChannel::cases()));
    expect($data['appointments']['total'])->toBe(0);
    expect($data['appointments']['cancellation_rate'])->toBeNull();
    expect($data['appointments']['no_show_rate'])->toBeNull();
    expect($data['reminders']['failure_rate'])->toBeNull();
    expect($data['patients']['new'])->toBe(0);
});

test('rates exclude rescheduled originals from cancellations and measure no-shows over attended appointments, rounded to 4 decimals', function () {
    ['scope' => $scope] = statsOrganization();
    $day = '2026-10-01 15:00:00';

    foreach (range(1, 4) as $i) {
        statsAppointment($scope, $day, AppointmentStatus::Completed);
    }
    statsAppointment($scope, $day, AppointmentStatus::Arrived);
    statsAppointment($scope, $day, AppointmentStatus::NoShow);
    statsAppointment($scope, $day, AppointmentStatus::Cancelled);
    statsAppointment($scope, $day, AppointmentStatus::Rescheduled);
    statsAppointment($scope, $day, AppointmentStatus::Rescheduled);
    statsAppointment($scope, $day, AppointmentStatus::Scheduled, AppointmentOrigin::Online);

    $appointments = actingAsAdmin()->getJson('/api/v1/admin/stats?from=2026-10-01&to=2026-10-01')->json('data.appointments');

    expect($appointments['total'])->toBe(10);
    expect($appointments['by_status'])->toBe([
        'scheduled' => 1, 'confirmed' => 0, 'arrived' => 1, 'completed' => 4, 'no_show' => 1, 'cancelled' => 1, 'rescheduled' => 2,
    ]);
    expect($appointments['by_origin'])->toBe(['online' => 1, 'manual' => 9]);
    // 1 / (10 − 2)
    expect($appointments['cancellation_rate'])->toBe(0.125);
    // 1 / (1 + 4 + 1)
    expect($appointments['no_show_rate'])->toBe(0.1667);
    expect($appointments['per_day'])->toBe([['date' => '2026-10-01', 'total' => 10, 'online' => 1, 'manual' => 9]]);
});

test('appointments are bucketed by local start date and soft-deleted ones are excluded', function () {
    ['scope' => $scope] = statsOrganization();
    // 01:00 UTC on Oct 3 = 22:00 on Oct 2 in Buenos Aires.
    statsAppointment($scope, '2026-10-03 01:00:00', AppointmentStatus::Completed, AppointmentOrigin::Online);
    statsAppointment($scope, '2026-10-03 15:00:00');
    statsAppointment($scope, '2026-10-03 16:00:00')->delete();

    $appointments = actingAsAdmin()->getJson('/api/v1/admin/stats?from=2026-10-02&to=2026-10-03')->json('data.appointments');

    expect($appointments['total'])->toBe(2);
    expect($appointments['per_day'])->toBe([
        ['date' => '2026-10-02', 'total' => 1, 'online' => 1, 'manual' => 0],
        ['date' => '2026-10-03', 'total' => 1, 'online' => 0, 'manual' => 1],
    ]);
});

test('organization_id scopes appointments, reminders and patients (by link date), and echoes the organization', function () {
    ['organization' => $mine, 'scope' => $mineScope] = statsOrganization('Consultorio Propio');
    ['scope' => $otherScope] = statsOrganization('Consultorio Ajeno');

    $appointment = statsAppointment($mineScope, '2026-10-02 15:00:00');
    statsAppointment($otherScope, '2026-10-02 15:00:00');
    Reminder::factory()->create([
        'organization_id' => $mine->id,
        'appointment_id' => $appointment->id,
        'channel' => ReminderChannel::Email,
        'status' => ReminderStatus::Sent,
        'scheduled_at' => CarbonImmutable::parse('2026-10-02 12:00:00', 'UTC'),
    ]);
    Reminder::factory()->create([
        'organization_id' => $mine->id,
        'appointment_id' => $appointment->id,
        'channel' => ReminderChannel::Email,
        'status' => ReminderStatus::Failed,
        'scheduled_at' => CarbonImmutable::parse('2026-10-02 13:00:00', 'UTC'),
    ]);

    // A patient created long ago, linked to this organization within the range.
    $this->travelTo(CarbonImmutable::parse('2026-01-01 12:00:00', 'UTC'));
    $patient = Patient::factory()->create();
    $this->travelTo(CarbonImmutable::parse('2026-10-03 15:00:00', 'UTC'));
    $mine->patients()->attach($patient);
    $this->travelTo(CarbonImmutable::parse('2026-10-04 15:00:00', 'UTC'));

    $response = actingAsAdmin()->getJson("/api/v1/admin/stats?from=2026-10-01&to=2026-10-04&organization_id={$mine->id}");

    $response->assertOk();
    $data = $response->json('data');
    expect($data['period']['organization'])->toBe(['id' => $mine->id, 'name' => 'Consultorio Propio']);
    expect($data['appointments']['total'])->toBe(1);
    expect($data['reminders']['total'])->toBe(2);
    expect($data['reminders']['by_status'])->toBe(['pending' => 0, 'queued' => 0, 'sent' => 1, 'failed' => 1]);
    expect($data['reminders']['failure_rate'])->toBe(0.5);
    expect($data['patients']['new'])->toBe(1);
    expect(array_column($data['patients']['per_day'], 'count'))->toBe([0, 0, 1, 0]);
    freshRequestState();

    // Unfiltered, patients count by their own creation date (several fixture patients were created "today").
    $global = actingAsAdmin()->getJson('/api/v1/admin/stats?from=2026-10-01&to=2026-10-04')->json('data');
    expect($global['appointments']['total'])->toBe(2);
    expect($global['patients']['per_day'][2]['count'])->toBe(0);
    expect($global['patients']['per_day'][3]['count'])->toBe(Patient::query()->where('created_at', '>=', '2026-10-04 03:00:00')->count());
});

test('invalid ranges are 422 on the right field', function (string $query, string $field) {
    actingAsAdmin()->getJson('/api/v1/admin/stats?'.$query)
        ->assertStatus(422)
        ->assertJsonValidationErrors([$field]);
})->with([
    'to before from' => ['from=2026-10-04&to=2026-10-01', 'to'],
    'more than 366 days' => ['from=2025-01-01&to=2026-01-02', 'to'],
    'bad format' => ['from=01/10/2026', 'from'],
    'only a future from' => ['from=2026-10-10', 'to'],
    'unknown organization' => ['organization_id=999999', 'organization_id'],
]);

test('a 366-day range is accepted', function () {
    actingAsAdmin()->getJson('/api/v1/admin/stats?from=2025-01-01&to=2026-01-01')
        ->assertOk()
        ->assertJsonCount(366, 'data.appointments.per_day');
});

test('only to given defaults from to 29 days earlier', function () {
    actingAsAdmin()->getJson('/api/v1/admin/stats?to=2026-09-30')
        ->assertOk()
        ->assertJsonPath('data.period.from', '2026-09-01')
        ->assertJsonPath('data.period.to', '2026-09-30');
});
