<?php

declare(strict_types=1);

use App\Enums\HolidaySource;
use App\Models\Availability;
use App\Models\Holiday;
use App\Models\Organization;

// Reuses createSlotsFixture()/slotsUrl()/slotStartTimes() from
// PublicBookingSlotsTest.php (same testsuite directory, so already
// declared globally by the time these tests run).

afterEach(function () {
    $this->travelBack();
});

test('a day with a holiday (source=auto) for the organization returns zero slots', function () {
    $this->travelTo('2026-07-20 00:00:00');
    [$organization, $membership, $service] = createSlotsFixture(30);
    Availability::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'day_of_week' => 1,
        'start_time' => '09:00:00',
        'end_time' => '11:00:00',
    ]);
    Holiday::factory()->create([
        'organization_id' => $organization->id,
        'date' => '2026-08-03',
        'source' => HolidaySource::Auto,
    ]);

    $response = $this->getJson(slotsUrl($organization, $membership, $service, '2026-08-03'));

    $response->assertOk();
    expect($response->json('data'))->toBe([]);
});

test('a day with a manual holiday behaves identically - origin is irrelevant to the read', function () {
    $this->travelTo('2026-07-20 00:00:00');
    [$organization, $membership, $service] = createSlotsFixture(30);
    Availability::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'day_of_week' => 1,
        'start_time' => '09:00:00',
        'end_time' => '11:00:00',
    ]);
    Holiday::factory()->manual()->create([
        'organization_id' => $organization->id,
        'date' => '2026-08-03',
    ]);

    $response = $this->getJson(slotsUrl($organization, $membership, $service, '2026-08-03'));

    $response->assertOk();
    expect($response->json('data'))->toBe([]);
});

test('a holiday belonging to a different organization does not suppress this organization slots for that date', function () {
    $this->travelTo('2026-07-20 00:00:00');
    [$organization, $membership, $service] = createSlotsFixture(30);
    Availability::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'day_of_week' => 1,
        'start_time' => '09:00:00',
        'end_time' => '10:00:00',
    ]);
    $otherOrganization = Organization::factory()->create();
    Holiday::factory()->create([
        'organization_id' => $otherOrganization->id,
        'date' => '2026-08-03',
    ]);

    $response = $this->getJson(slotsUrl($organization, $membership, $service, '2026-08-03'));

    $response->assertOk();
    expect(slotStartTimes($response->json('data')))->toBe(['09:00', '09:30']);
});

test('a day with no holiday returns exactly the slots it returned before (regression guard)', function () {
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
    expect(slotStartTimes($response->json('data')))->toBe(['09:00', '09:30', '10:00', '10:30']);
});
