<?php

declare(strict_types=1);

use App\Enums\AppointmentStatus;
use App\Enums\AvailabilityExceptionType;
use App\Models\Appointment;
use App\Models\Availability;
use App\Models\AvailabilityException;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\ProfessionalService;
use App\Models\Service;
use App\Models\User;
use Carbon\CarbonImmutable;

afterEach(function () {
    $this->travelBack();
});

/**
 * UTC timezone keeps clock times and every plain date/time string below
 * unambiguous — timezone-conversion itself is exercised elsewhere
 * (ListAvailableSlotsAction/ComputePublishedDayIntervalsAction).
 *
 * @return array{0: Organization, 1: Membership, 2: Service}
 */
function createSlotsFixture(int $durationMinutes = 30): array
{
    $organization = Organization::factory()->create(['timezone' => 'UTC']);
    $membership = Membership::factory()->create(['organization_id' => $organization->id]);
    $service = Service::factory()->create();
    ProfessionalService::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'service_id' => $service->id,
        'duration_minutes' => $durationMinutes,
        'active' => true,
    ]);

    return [$organization, $membership, $service];
}

function slotsUrl(Organization $organization, Membership $membership, Service $service, string $from, ?string $to = null): string
{
    return '/api/v1/booking/'.$organization->slug.'/slots?'.http_build_query([
        'membership_id' => $membership->id,
        'service_id' => $service->id,
        'from' => $from,
        'to' => $to ?? $from,
    ]);
}

/**
 * @param  array<int, array{start_at: string, end_at: string}>  $slots
 * @return array<int, string>
 */
function slotStartTimes(array $slots): array
{
    return collect($slots)
        ->map(fn (array $slot): string => CarbonImmutable::parse($slot['start_at'])->format('H:i'))
        ->all();
}

test('slots for a weekly availability are exactly duration_minutes long and cover the whole published range', function () {
    $this->travelTo('2026-07-20 00:00:00');
    [$organization, $membership, $service] = createSlotsFixture(30);
    Availability::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'day_of_week' => 1,
        'start_time' => '09:00:00',
        'end_time' => '11:00:00',
    ]);

    $response = $this->getJson(slotsUrl($organization, $membership, $service, '2026-08-03'));

    $response->assertOk();
    $slots = $response->json('data');
    expect($slots)->toHaveCount(4);
    foreach ($slots as $slot) {
        $duration = (int) CarbonImmutable::parse($slot['start_at'])->diffInMinutes(CarbonImmutable::parse($slot['end_at']));
        expect($duration)->toBe(30);
    }
    expect(slotStartTimes($slots))->toBe(['09:00', '09:30', '10:00', '10:30']);
    expect(CarbonImmutable::parse($slots[3]['end_at'])->format('H:i'))->toBe('11:00');
});

test('a slot overlapping an active appointment of the professional is excluded', function () {
    $this->travelTo('2026-07-20 00:00:00');
    [$organization, $membership, $service] = createSlotsFixture(30);
    Availability::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'day_of_week' => 1,
        'start_time' => '09:00:00',
        'end_time' => '10:00:00',
    ]);
    Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'service_id' => $service->id,
        'status' => AppointmentStatus::Scheduled,
        'start_at' => '2026-08-03 09:30:00',
        'end_at' => '2026-08-03 10:00:00',
    ]);

    $response = $this->getJson(slotsUrl($organization, $membership, $service, '2026-08-03'));

    $response->assertOk();
    expect(slotStartTimes($response->json('data')))->toBe(['09:00']);
});

test('slots overlapping only a cancelled or a rescheduled appointment are not excluded', function () {
    $this->travelTo('2026-07-20 00:00:00');
    [$organization, $membership, $service] = createSlotsFixture(30);
    Availability::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'day_of_week' => 1,
        'start_time' => '09:00:00',
        'end_time' => '10:00:00',
    ]);
    Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'service_id' => $service->id,
        'status' => AppointmentStatus::Cancelled,
        'start_at' => '2026-08-03 09:00:00',
        'end_at' => '2026-08-03 09:30:00',
    ]);
    Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'service_id' => $service->id,
        'status' => AppointmentStatus::Rescheduled,
        'start_at' => '2026-08-03 09:30:00',
        'end_at' => '2026-08-03 10:00:00',
    ]);

    $response = $this->getJson(slotsUrl($organization, $membership, $service, '2026-08-03'));

    $response->assertOk();
    expect(slotStartTimes($response->json('data')))->toBe(['09:00', '09:30']);
});

test('a blocked exception removes only the slots it covers', function () {
    $this->travelTo('2026-07-20 00:00:00');
    [$organization, $membership, $service] = createSlotsFixture(30);
    Availability::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'day_of_week' => 1,
        'start_time' => '09:00:00',
        'end_time' => '11:00:00',
    ]);
    AvailabilityException::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'type' => AvailabilityExceptionType::Blocked,
        'start_at' => '2026-08-03 10:00:00',
        'end_at' => '2026-08-03 10:30:00',
    ]);

    $response = $this->getJson(slotsUrl($organization, $membership, $service, '2026-08-03'));

    $response->assertOk();
    expect(slotStartTimes($response->json('data')))->toBe(['09:00', '09:30', '10:30']);
});

test('an extra exception adds slots outside the weekly schedule', function () {
    $this->travelTo('2026-07-20 00:00:00');
    [$organization, $membership, $service] = createSlotsFixture(30);
    AvailabilityException::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'type' => AvailabilityExceptionType::Extra,
        'start_at' => '2026-08-03 14:00:00',
        'end_at' => '2026-08-03 15:00:00',
    ]);

    $response = $this->getJson(slotsUrl($organization, $membership, $service, '2026-08-03'));

    $response->assertOk();
    expect(slotStartTimes($response->json('data')))->toBe(['14:00', '14:30']);
});

test('slots for today whose start time already passed are not returned', function () {
    $this->travelTo('2026-08-03 10:15:00');
    [$organization, $membership, $service] = createSlotsFixture(30);
    Availability::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'day_of_week' => 1,
        'start_time' => '09:00:00',
        'end_time' => '11:00:00',
    ]);

    $response = $this->getJson(slotsUrl($organization, $membership, $service, '2026-08-03'));

    $response->assertOk();
    expect(slotStartTimes($response->json('data')))->toBe(['10:30']);
});

test('an active appointment of the same physical professional in a different organization also blocks the slot (CU-23)', function () {
    $this->travelTo('2026-07-20 00:00:00');
    $user = User::factory()->create();

    $organizationA = Organization::factory()->create(['timezone' => 'UTC']);
    $organizationB = Organization::factory()->create(['timezone' => 'UTC']);

    $membershipA = Membership::factory()->create(['organization_id' => $organizationA->id, 'user_id' => $user->id]);
    $membershipB = Membership::factory()->create(['organization_id' => $organizationB->id, 'user_id' => $user->id]);

    $serviceA = Service::factory()->create();
    ProfessionalService::factory()->create([
        'organization_id' => $organizationA->id,
        'membership_id' => $membershipA->id,
        'service_id' => $serviceA->id,
        'duration_minutes' => 30,
        'active' => true,
    ]);
    $serviceB = Service::factory()->create();
    ProfessionalService::factory()->create([
        'organization_id' => $organizationB->id,
        'membership_id' => $membershipB->id,
        'service_id' => $serviceB->id,
        'duration_minutes' => 30,
        'active' => true,
    ]);

    Availability::factory()->create([
        'organization_id' => $organizationA->id,
        'membership_id' => $membershipA->id,
        'day_of_week' => 1,
        'start_time' => '09:00:00',
        'end_time' => '10:00:00',
    ]);

    Appointment::factory()->create([
        'organization_id' => $organizationB->id,
        'membership_id' => $membershipB->id,
        'service_id' => $serviceB->id,
        'status' => AppointmentStatus::Scheduled,
        'start_at' => '2026-08-03 09:00:00',
        'end_at' => '2026-08-03 09:30:00',
    ]);

    $response = $this->getJson(slotsUrl($organizationA, $membershipA, $serviceA, '2026-08-03'));

    $response->assertOk();
    expect(slotStartTimes($response->json('data')))->toBe(['09:30']);
});

test('a franja whose final remainder is shorter than the service duration does not yield a partial slot', function () {
    $this->travelTo('2026-07-20 00:00:00');
    [$organization, $membership, $service] = createSlotsFixture(30);
    Availability::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'day_of_week' => 1,
        'start_time' => '09:00:00',
        'end_time' => '10:15:00',
    ]);

    $response = $this->getJson(slotsUrl($organization, $membership, $service, '2026-08-03'));

    $response->assertOk();
    expect(slotStartTimes($response->json('data')))->toBe(['09:00', '09:30']);
});

test('to beyond today plus 60 days returns 422', function () {
    $this->travelTo('2026-08-01 00:00:00');
    [$organization, $membership, $service] = createSlotsFixture(30);

    $this->getJson(slotsUrl($organization, $membership, $service, '2026-08-03', '2026-10-05'))
        ->assertStatus(422)
        ->assertJsonValidationErrors('to');
});

test('from before today returns 422', function () {
    $this->travelTo('2026-08-01 00:00:00');
    [$organization, $membership, $service] = createSlotsFixture(30);

    $this->getJson(slotsUrl($organization, $membership, $service, '2026-07-31'))
        ->assertStatus(422)
        ->assertJsonValidationErrors('from');
});

test('missing or nonexistent membership_id or service_id returns 422', function () {
    [$organization, $membership, $service] = createSlotsFixture(30);

    $this->getJson('/api/v1/booking/'.$organization->slug.'/slots?'.http_build_query([
        'service_id' => $service->id,
        'from' => '2026-08-03',
        'to' => '2026-08-03',
    ]))->assertStatus(422)->assertJsonValidationErrors('membership_id');

    $this->getJson('/api/v1/booking/'.$organization->slug.'/slots?'.http_build_query([
        'membership_id' => $membership->id,
        'from' => '2026-08-03',
        'to' => '2026-08-03',
    ]))->assertStatus(422)->assertJsonValidationErrors('service_id');

    $this->getJson('/api/v1/booking/'.$organization->slug.'/slots?'.http_build_query([
        'membership_id' => 999999,
        'service_id' => $service->id,
        'from' => '2026-08-03',
        'to' => '2026-08-03',
    ]))->assertStatus(422)->assertJsonValidationErrors('membership_id');

    $this->getJson('/api/v1/booking/'.$organization->slug.'/slots?'.http_build_query([
        'membership_id' => $membership->id,
        'service_id' => 999999,
        'from' => '2026-08-03',
        'to' => '2026-08-03',
    ]))->assertStatus(422)->assertJsonValidationErrors('service_id');
});

test('a membership_id from another organization returns 404', function () {
    $this->travelTo('2026-07-20 00:00:00');
    [$organization, , $service] = createSlotsFixture(30);
    $otherOrganization = Organization::factory()->create();
    $otherMembership = Membership::factory()->create(['organization_id' => $otherOrganization->id]);
    ProfessionalService::factory()->create([
        'organization_id' => $otherOrganization->id,
        'membership_id' => $otherMembership->id,
        'service_id' => $service->id,
        'duration_minutes' => 30,
        'active' => true,
    ]);

    $this->getJson(slotsUrl($organization, $otherMembership, $service, '2026-08-03'))
        ->assertStatus(404);
});

test('a guest gets 200 on slots: the endpoint does not require authentication', function () {
    $this->travelTo('2026-07-20 00:00:00');
    [$organization, $membership, $service] = createSlotsFixture(30);
    Availability::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'day_of_week' => 1,
        'start_time' => '09:00:00',
        'end_time' => '10:00:00',
    ]);

    $this->getJson(slotsUrl($organization, $membership, $service, '2026-08-03'))->assertOk();
});
