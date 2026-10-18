<?php

declare(strict_types=1);

use App\Models\Appointment;
use App\Models\Availability;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Patient;
use App\Models\ProfessionalService;
use App\Models\Service;
use Carbon\CarbonImmutable;
use Illuminate\Testing\TestResponse;

// The public booking throttle (#299), with the defaults in config/booking.php:
// 5 created bookings an hour per IP and organization, 20 per IP, 10 attempts a
// minute per IP, and 60 slot searches a minute per IP and organization.

beforeEach(function () {
    $this->travelTo('2026-07-20 00:00:00');
});

afterEach(function () {
    $this->travelBack();
});

/**
 * A professional with a public slug and a Monday 09:00–17:00 schedule, in an
 * organization in UTC: 16 half-hour slots on 2026-08-03.
 *
 * @return array{0: Organization, 1: Membership, 2: Service}
 */
function rateLimitedBookingFixture(): array
{
    $organization = Organization::factory()->create(['timezone' => 'UTC']);
    $membership = Membership::factory()->professional()->create([
        'organization_id' => $organization->id,
        'slug' => 'profesional-'.$organization->id,
    ]);
    $service = Service::factory()->create();
    ProfessionalService::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'service_id' => $service->id,
        'duration_minutes' => 30,
        'active' => true,
    ]);
    Availability::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'day_of_week' => 1,
        'start_time' => '09:00:00',
        'end_time' => '17:00:00',
    ]);

    return [$organization, $membership, $service];
}

/**
 * Books the `$slot`-th half-hour slot of 2026-08-03 through `$slug`.
 */
function bookSlot(string $slug, Membership $membership, Service $service, int $slot): TestResponse
{
    return test()->postJson("/api/v1/booking/{$slug}/appointments", [
        'membership_id' => $membership->id,
        'service_id' => $service->id,
        'start_at' => CarbonImmutable::parse('2026-08-03T09:00:00Z')->addMinutes(30 * $slot)->toIso8601ZuluString(),
        'patient' => [
            'name' => 'Juan Pérez',
            'document_type' => 'dni',
            'document_number' => fake()->unique()->numerify('########'),
            'email' => 'juan@example.com',
            'phone' => '1122334455',
        ],
    ]);
}

test('the sixth booking an hour from one ip at one organization is a 429 that creates no appointment or patient', function () {
    [$organization, $membership, $service] = rateLimitedBookingFixture();

    foreach (range(0, 4) as $slot) {
        bookSlot($organization->slug, $membership, $service, $slot)->assertCreated();
    }

    bookSlot($organization->slug, $membership, $service, 5)
        ->assertStatus(429)
        ->assertHeader('Retry-After');

    expect(Appointment::query()->count())->toBe(5)
        ->and(Patient::query()->count())->toBe(5);
});

test('the hourly limit resets after an hour', function () {
    [$organization, $membership, $service] = rateLimitedBookingFixture();

    foreach (range(0, 4) as $slot) {
        bookSlot($organization->slug, $membership, $service, $slot)->assertCreated();
    }
    bookSlot($organization->slug, $membership, $service, 5)->assertStatus(429);

    $this->travel(1)->hours();

    bookSlot($organization->slug, $membership, $service, 5)->assertCreated();
});

test('the limit at one organization leaves another organization alone', function () {
    [$organization, $membership, $service] = rateLimitedBookingFixture();
    [$other, $otherMembership, $otherService] = rateLimitedBookingFixture();

    foreach (range(0, 4) as $slot) {
        bookSlot($organization->slug, $membership, $service, $slot)->assertCreated();
    }
    bookSlot($organization->slug, $membership, $service, 5)->assertStatus(429);

    bookSlot($other->slug, $otherMembership, $otherService, 0)->assertCreated();
});

test('the practice slug and a professional slug share the organization limit', function () {
    [$organization, $membership, $service] = rateLimitedBookingFixture();

    foreach (range(0, 4) as $slot) {
        bookSlot($organization->slug, $membership, $service, $slot)->assertCreated();
    }

    bookSlot((string) $membership->slug, $membership, $service, 5)->assertStatus(429);
});

test('another ip has its own limit', function () {
    [$organization, $membership, $service] = rateLimitedBookingFixture();

    foreach (range(0, 4) as $slot) {
        bookSlot($organization->slug, $membership, $service, $slot)->assertCreated();
    }

    $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.2']);
    bookSlot($organization->slug, $membership, $service, 5)->assertCreated();
});

test('one ip books at most 20 times an hour across organizations', function () {
    foreach (range(1, 4) as $round) {
        [$organization, $membership, $service] = rateLimitedBookingFixture();
        foreach (range(0, 4) as $slot) {
            bookSlot($organization->slug, $membership, $service, $slot)->assertCreated();
        }
        // Past the per-minute attempts limit, which is not what this tests.
        $this->travel(61)->seconds();
    }

    [$fifth, $fifthMembership, $fifthService] = rateLimitedBookingFixture();
    bookSlot($fifth->slug, $fifthMembership, $fifthService, 0)->assertStatus(429);
    expect(Appointment::withoutGlobalScope('organization')->count())->toBe(20);
});

test('a rejected booking does not use up the hourly limits', function () {
    [$organization, $membership, $service] = rateLimitedBookingFixture();

    foreach (range(1, 5) as $attempt) {
        $this->postJson("/api/v1/booking/{$organization->slug}/appointments", [])->assertUnprocessable();
    }

    foreach (range(0, 4) as $slot) {
        bookSlot($organization->slug, $membership, $service, $slot)->assertCreated();
    }
});

test('the eleventh attempt within a minute is a 429 whatever the outcome, and the minute resets', function () {
    [$organization] = rateLimitedBookingFixture();
    $url = "/api/v1/booking/{$organization->slug}/appointments";

    foreach (range(1, 10) as $attempt) {
        $this->postJson($url, [])->assertUnprocessable();
    }
    $this->postJson($url, [])->assertStatus(429);

    $this->travel(61)->seconds();
    $this->postJson($url, [])->assertUnprocessable();
});

test('a request to an unknown slug is a 404 that uses up no attempts', function () {
    [$organization, $membership, $service] = rateLimitedBookingFixture();

    foreach (range(1, 10) as $attempt) {
        $this->postJson('/api/v1/booking/no-existe/appointments', [])->assertNotFound();
    }

    bookSlot($organization->slug, $membership, $service, 0)->assertCreated();
});

test('a limit set to 0 is off', function () {
    config(['booking.rate_limits.bookings_per_organization' => 0]);
    [$organization, $membership, $service] = rateLimitedBookingFixture();

    foreach (range(0, 5) as $slot) {
        bookSlot($organization->slug, $membership, $service, $slot)->assertCreated();
    }
});

test('the 61st slot search within a minute from one ip at one organization is a 429', function () {
    [$organization, $membership, $service] = rateLimitedBookingFixture();
    [$other, $otherMembership, $otherService] = rateLimitedBookingFixture();

    foreach (range(1, 60) as $search) {
        $this->getJson(slotsUrl($organization, $membership, $service, '2026-08-03'))->assertOk();
    }

    $this->getJson(slotsUrl($organization, $membership, $service, '2026-08-03'))
        ->assertStatus(429)
        ->assertHeader('Retry-After');
    $this->getJson(slotsUrl($other, $otherMembership, $otherService, '2026-08-03'))->assertOk();

    $this->travel(61)->seconds();
    $this->getJson(slotsUrl($organization, $membership, $service, '2026-08-03'))->assertOk();
});

test('slot searches are unlimited when their limit is 0', function () {
    config(['booking.rate_limits.slot_searches_per_minute' => 0]);
    [$organization, $membership, $service] = rateLimitedBookingFixture();

    foreach (range(1, 61) as $search) {
        $this->getJson(slotsUrl($organization, $membership, $service, '2026-08-03'))->assertOk();
    }
});
