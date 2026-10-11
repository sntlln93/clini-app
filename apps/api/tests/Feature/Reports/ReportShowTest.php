<?php

declare(strict_types=1);

use App\Enums\AppointmentOrigin;
use App\Enums\AppointmentStatus;
use App\Enums\AvailabilityExceptionType;
use App\Models\Appointment;
use App\Models\Availability;
use App\Models\AvailabilityException;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\OrganizationHoliday;
use App\Models\Patient;
use App\Models\Subscription;
use App\Models\User;
use App\Support\CurrentOrganization;
use Carbon\CarbonImmutable;

const REPORT_TIMEZONE = 'America/Argentina/Buenos_Aires';

beforeEach(function () {
    // Noon in Buenos Aires.
    $this->travelTo(CarbonImmutable::parse('2026-10-15 15:00:00', 'UTC'));
});

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
    $this->travelBack();
});

/**
 * @return array{organization: Organization, owner: Membership, ana: Membership, bruno: Membership}
 */
function reportsFixture(): array
{
    $organization = Organization::factory()->center()->create(['timezone' => REPORT_TIMEZONE]);
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $ana = Membership::factory()->professional()->create([
        'organization_id' => $organization->id,
        'user_id' => User::factory()->create(['name' => 'Ana Pérez'])->id,
    ]);
    $bruno = Membership::factory()->professional()->create([
        'organization_id' => $organization->id,
        'user_id' => User::factory()->create(['name' => 'Bruno Díaz'])->id,
    ]);

    return ['organization' => $organization, 'owner' => $owner, 'ana' => $ana, 'bruno' => $bruno];
}

/**
 * Local Buenos Aires times, stored as UTC like the app does.
 */
function reportAppointment(Membership $membership, string $localStart, string $localEnd, AppointmentStatus $status, AppointmentOrigin $origin): Appointment
{
    return Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'status' => $status,
        'origin' => $origin,
        'start_at' => CarbonImmutable::parse($localStart, REPORT_TIMEZONE)->utc(),
        'end_at' => CarbonImmutable::parse($localEnd, REPORT_TIMEZONE)->utc(),
    ]);
}

function reportWeekly(Membership $membership, int $dayOfWeek, string $start, string $end): void
{
    Availability::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'day_of_week' => $dayOfWeek,
        'start_time' => $start,
        'end_time' => $end,
    ]);
}

/**
 * Two weeks, Mon 7 – Sun 20 Sep 2026, computed by hand:
 *
 * Ana publishes Mondays 09–13 (240 min). On Mon 14 an organization-wide
 * block (10–11) leaves 180, so 420 in all. Booked inside: Mon 7 60 + 30 + 30
 * (12:30–13:30 only counts up to 13:00), Mon 14 60; the cancelled and the
 * rescheduled original don't count. 180 / 420.
 *
 * Bruno publishes Tuesdays 14–18 (240 min), but Tue 8 is an organization
 * holiday, so 240 in all. Booked inside: Tue 15 60 (the Tue 8 appointment
 * falls on the holiday). 60 / 240.
 *
 * @return array{organization: Organization, owner: Membership, ana: Membership, bruno: Membership}
 */
function seedReportCase(): array
{
    $fixture = reportsFixture();
    ['organization' => $organization, 'ana' => $ana, 'bruno' => $bruno] = $fixture;

    reportWeekly($ana, 1, '09:00:00', '13:00:00');
    reportWeekly($bruno, 2, '14:00:00', '18:00:00');
    AvailabilityException::factory()->organizationWide()->create([
        'organization_id' => $organization->id,
        'type' => AvailabilityExceptionType::Blocked,
        'start_at' => CarbonImmutable::parse('2026-09-14 10:00', REPORT_TIMEZONE)->utc(),
        'end_at' => CarbonImmutable::parse('2026-09-14 11:00', REPORT_TIMEZONE)->utc(),
    ]);
    OrganizationHoliday::factory()->create(['organization_id' => $organization->id, 'date' => '2026-09-08']);

    reportAppointment($ana, '2026-09-07 09:00', '2026-09-07 10:00', AppointmentStatus::Completed, AppointmentOrigin::Manual);
    reportAppointment($ana, '2026-09-07 10:00', '2026-09-07 10:30', AppointmentStatus::NoShow, AppointmentOrigin::Online);
    reportAppointment($ana, '2026-09-07 12:30', '2026-09-07 13:30', AppointmentStatus::Arrived, AppointmentOrigin::Manual);
    reportAppointment($ana, '2026-09-14 10:00', '2026-09-14 10:30', AppointmentStatus::Cancelled, AppointmentOrigin::Online);
    reportAppointment($ana, '2026-09-14 09:00', '2026-09-14 09:30', AppointmentStatus::Rescheduled, AppointmentOrigin::Manual);
    reportAppointment($ana, '2026-09-14 11:00', '2026-09-14 12:00', AppointmentStatus::Scheduled, AppointmentOrigin::Manual);
    reportAppointment($ana, '2026-09-21 09:00', '2026-09-21 10:00', AppointmentStatus::Completed, AppointmentOrigin::Manual);

    reportAppointment($bruno, '2026-09-15 14:00', '2026-09-15 15:00', AppointmentStatus::NoShow, AppointmentOrigin::Manual);
    reportAppointment($bruno, '2026-09-08 14:00', '2026-09-08 15:00', AppointmentStatus::Completed, AppointmentOrigin::Manual);
    // 23:30 on Sun 20 in Buenos Aires is already Mon 21 in UTC.
    reportAppointment($bruno, '2026-09-20 23:30', '2026-09-21 00:00', AppointmentStatus::Completed, AppointmentOrigin::Manual);

    return $fixture;
}

function reportUrl(array $query = []): string
{
    return '/api/v1/reports?'.http_build_query($query);
}

test('the report matches the hand-computed case, per professional and per week', function () {
    ['owner' => $owner, 'ana' => $ana, 'bruno' => $bruno] = seedReportCase();
    Membership::factory()->professional()->create(['organization_id' => $owner->organization_id, 'status' => 'inactive']);
    Membership::factory()->staff()->create(['organization_id' => $owner->organization_id]);

    $response = $this->actingAs($owner->user)
        ->getJson(reportUrl(['from' => '2026-09-07', 'to' => '2026-09-20', 'granularity' => 'week']))
        ->assertOk();

    expect($response->json('data.period'))->toBe(['from' => '2026-09-07', 'to' => '2026-09-20', 'timezone' => REPORT_TIMEZONE, 'granularity' => 'week'])
        ->and($response->json('data.professionals'))->toBe([
            ['membership_id' => $ana->id, 'name' => 'Ana Pérez', 'published_minutes' => 420, 'booked_minutes' => 180, 'occupancy_rate' => 0.4286, 'attended' => 2, 'no_show' => 1, 'no_show_rate' => 0.3333],
            ['membership_id' => $bruno->id, 'name' => 'Bruno Díaz', 'published_minutes' => 240, 'booked_minutes' => 60, 'occupancy_rate' => 0.25, 'attended' => 2, 'no_show' => 1, 'no_show_rate' => 0.3333],
        ])
        ->and($response->json('data.series'))->toBe([
            ['start' => '2026-09-07', 'end' => '2026-09-13', 'published_minutes' => 240, 'booked_minutes' => 120, 'occupancy_rate' => 0.5, 'attended' => 3, 'no_show' => 1, 'no_show_rate' => 0.25, 'online' => 1, 'manual' => 3],
            ['start' => '2026-09-14', 'end' => '2026-09-20', 'published_minutes' => 420, 'booked_minutes' => 120, 'occupancy_rate' => 0.2857, 'attended' => 1, 'no_show' => 1, 'no_show_rate' => 0.5, 'online' => 1, 'manual' => 3],
        ])
        ->and($response->json('data.origin'))->toBe(['online' => 2, 'manual' => 6]);
});

test('monthly buckets are calendar months cut to the period', function () {
    ['owner' => $owner] = seedReportCase();

    $series = $this->actingAs($owner->user)
        ->getJson(reportUrl(['from' => '2026-08-25', 'to' => '2026-09-20']))
        ->assertOk()
        ->json('data.series');

    expect(array_map(fn (array $bucket): array => [$bucket['start'], $bucket['end'], $bucket['published_minutes'], $bucket['booked_minutes']], $series))->toBe([
        // Bruno's Tuesday 25 Aug and Ana's Monday 31 Aug, nothing booked.
        ['2026-08-25', '2026-08-31', 480, 0],
        // The two weeks above plus Bruno's Tuesday 1 Sep.
        ['2026-09-01', '2026-09-20', 900, 240],
    ]);
});

test('new patients are counted per month by their link date to the organization, in its timezone', function () {
    ['organization' => $organization, 'owner' => $owner] = reportsFixture();
    $other = Organization::factory()->create();

    foreach (['2026-08-31 12:00', '2026-09-10 12:00', '2026-09-30 23:30', '2026-10-01 10:00'] as $linkedAt) {
        $this->travelTo(CarbonImmutable::parse($linkedAt, REPORT_TIMEZONE));
        $organization->patients()->attach(Patient::factory()->create());
    }
    $this->travelTo(CarbonImmutable::parse('2026-09-15 12:00', REPORT_TIMEZONE));
    $other->patients()->attach(Patient::factory()->create());
    $deleted = Patient::factory()->create();
    $organization->patients()->attach($deleted);
    $deleted->delete();
    $this->travelTo(CarbonImmutable::parse('2026-10-15 12:00', REPORT_TIMEZONE));

    $this->actingAs($owner->user)
        ->getJson(reportUrl(['from' => '2026-09-01', 'to' => '2026-10-15']))
        ->assertOk()
        ->assertJsonPath('data.new_patients', ['total' => 3, 'per_month' => [
            ['month' => '2026-09', 'count' => 2],
            ['month' => '2026-10', 'count' => 1],
        ]]);
});

test('without filters the period is the last three calendar months up to today, by month', function () {
    ['owner' => $owner] = reportsFixture();

    $response = $this->actingAs($owner->user)->getJson('/api/v1/reports')->assertOk();

    expect($response->json('data.period'))->toBe(['from' => '2026-08-01', 'to' => '2026-10-15', 'timezone' => REPORT_TIMEZONE, 'granularity' => 'month'])
        ->and(array_column($response->json('data.series'), 'start'))->toBe(['2026-08-01', '2026-09-01', '2026-10-01'])
        ->and($response->json('data.series.0.occupancy_rate'))->toBeNull()
        ->and($response->json('data.series.0.no_show_rate'))->toBeNull();
});

test('an admin sees the whole organization too', function () {
    ['organization' => $organization] = reportsFixture();
    $admin = Membership::factory()->admin()->create(['organization_id' => $organization->id]);

    $this->actingAs($admin->user)->getJson(reportUrl())
        ->assertOk()
        ->assertJsonCount(2, 'data.professionals');
});

test('a professional sees only their own report, without the organization\'s new patients', function () {
    ['ana' => $ana] = seedReportCase();

    $this->actingAs($ana->user)
        ->getJson(reportUrl(['from' => '2026-09-07', 'to' => '2026-09-20', 'membership_id' => $ana->id]))
        ->assertOk()
        ->assertJsonCount(1, 'data.professionals')
        ->assertJsonPath('data.professionals.0.membership_id', $ana->id)
        ->assertJsonPath('data.series.0.booked_minutes', 180)
        ->assertJsonPath('data.series.0.manual', 3)
        ->assertJsonPath('data.origin', ['online' => 2, 'manual' => 3])
        ->assertJsonPath('data.new_patients', null);
});

test('a professional cannot see another professional\'s report or the whole organization\'s', function () {
    ['ana' => $ana, 'bruno' => $bruno] = reportsFixture();

    $this->actingAs($ana->user)->getJson(reportUrl(['membership_id' => $bruno->id]))->assertForbidden();
    $this->actingAs($ana->user)->getJson(reportUrl())->assertForbidden();
});

test('an owner can narrow the report to one professional', function () {
    ['owner' => $owner, 'bruno' => $bruno] = seedReportCase();

    $this->actingAs($owner->user)
        ->getJson(reportUrl(['from' => '2026-09-07', 'to' => '2026-09-20', 'membership_id' => $bruno->id]))
        ->assertOk()
        ->assertJsonCount(1, 'data.professionals')
        ->assertJsonPath('data.professionals.0.occupancy_rate', 0.25)
        ->assertJsonPath('data.new_patients', null);
});

test('staff has no access to reports', function () {
    ['organization' => $organization, 'ana' => $ana] = reportsFixture();
    $staff = Membership::factory()->staff()->create(['organization_id' => $organization->id]);

    $this->actingAs($staff->user)->getJson(reportUrl())->assertForbidden();
    $this->actingAs($staff->user)->getJson(reportUrl(['membership_id' => $ana->id]))->assertForbidden();
});

test('reports are only part of Center', function (Closure $makeOwner, string $plan) {
    $owner = $makeOwner();

    $this->actingAs($owner->user)->getJson(reportUrl())
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'plans.feature_unavailable')
        ->assertJsonPath('error.context', ['plan' => $plan, 'feature' => 'reports']);
})->with([
    'free' => [fn () => Membership::factory()->owner()->create(), 'free'],
    'practice' => [function () {
        $owner = Membership::factory()->owner()->create();
        Subscription::factory()->create(['organization_id' => $owner->organization_id, 'provider_subscription_id' => null]);

        return $owner;
    }, 'practice'],
]);

test('another organization\'s appointments never count', function () {
    ['owner' => $owner] = seedReportCase();
    $outsider = Membership::factory()->professional()->create(['organization_id' => Organization::factory()->center()->create()->id]);
    reportAppointment($outsider, '2026-09-07 09:00', '2026-09-07 10:00', AppointmentStatus::NoShow, AppointmentOrigin::Online);

    $this->actingAs($owner->user)
        ->getJson(reportUrl(['from' => '2026-09-07', 'to' => '2026-09-20']))
        ->assertOk()
        ->assertJsonPath('data.origin', ['online' => 2, 'manual' => 6]);
});

test('invalid filters return 422 on the right field', function (array $query, string $field) {
    ['organization' => $organization, 'owner' => $owner] = reportsFixture();
    $query = array_map(fn (mixed $value): mixed => match ($value) {
        'other-org' => Membership::factory()->professional()->create()->id,
        'staff' => Membership::factory()->staff()->create(['organization_id' => $organization->id])->id,
        default => $value,
    }, $query);

    $this->actingAs($owner->user)->getJson(reportUrl($query))
        ->assertStatus(422)
        ->assertJsonValidationErrors($field);
})->with([
    'to before from' => [['from' => '2026-09-10', 'to' => '2026-09-01'], 'to'],
    'more than 366 days' => [['from' => '2025-01-01', 'to' => '2026-01-02'], 'to'],
    'bad date' => [['from' => '2026-02-30'], 'from'],
    'unknown granularity' => [['granularity' => 'day'], 'granularity'],
    'a professional of another organization' => [['membership_id' => 'other-org'], 'membership_id'],
    'a member who is not a professional' => [['membership_id' => 'staff'], 'membership_id'],
]);

test('a deactivated professional keeps their row, so the rows add up to the period totals', function () {
    ['owner' => $owner, 'bruno' => $bruno] = seedReportCase();
    $bruno->update(['status' => 'inactive']);
    $bruno->delete();

    $response = $this->actingAs($owner->user)
        ->getJson(reportUrl(['from' => '2026-09-07', 'to' => '2026-09-20']))
        ->assertOk();

    expect(array_column($response->json('data.professionals'), 'name'))->toBe(['Ana Pérez', 'Bruno Díaz'])
        ->and($response->json('data.professionals.1.no_show'))->toBe(1)
        ->and(array_sum(array_column($response->json('data.professionals'), 'no_show')))
        ->toBe(array_sum(array_column($response->json('data.series'), 'no_show')));
});
