<?php

declare(strict_types=1);

use App\Enums\Province;
use App\Models\Address;
use App\Models\Availability;
use App\Models\City;
use App\Models\Holiday;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\OrganizationHoliday;
use App\Models\Service;

// Reuses createSlotsFixture()/slotsUrl()/slotStartTimes() from
// PublicBookingSlotsTest.php (same testsuite directory, so already
// declared globally by the time these tests run).

afterEach(function () {
    $this->travelBack();
});

/**
 * A bookable Monday 09:00-11:00 (four 30-minute slots) for a fresh
 * organization, optionally given an address in `$city`.
 *
 * @return array{0: Organization, 1: Membership, 2: Service}
 */
function holidayFixture(?City $city = null): array
{
    [$organization, $membership, $service] = createSlotsFixture(30);
    Availability::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'day_of_week' => 1,
        'start_time' => '09:00:00',
        'end_time' => '11:00:00',
    ]);

    if ($city !== null) {
        Address::factory()->create([
            'addressable_type' => Organization::class,
            'addressable_id' => $organization->id,
            'city_id' => $city->id,
        ]);
    }

    return [$organization, $membership, $service];
}

/**
 * @param  array{0: Organization, 1: Membership, 2: Service}  $fixture
 * @return array<int, string>
 */
function slotsOn(array $fixture, string $date): array
{
    [$organization, $membership, $service] = $fixture;

    $response = test()->getJson(slotsUrl($organization, $membership, $service, $date));
    $response->assertOk();

    return slotStartTimes($response->json('data'));
}

/**
 * @return array<int, string>
 */
function allHolidayFixtureSlots(): array
{
    return ['09:00', '09:30', '10:00', '10:30'];
}

test('a national catalog holiday suppresses slots for every organization, with or without an address', function () {
    $this->travelTo('2026-07-20 00:00:00');
    $withoutAddress = holidayFixture();
    $inLaRioja = holidayFixture(City::factory()->inProvince(Province::LaRioja)->create());
    Holiday::factory()->create(['date' => '2026-08-03']);

    expect(slotsOn($withoutAddress, '2026-08-03'))->toBe([]);
    expect(slotsOn($inLaRioja, '2026-08-03'))->toBe([]);
});

test('a provincial catalog holiday suppresses slots only for organizations in that province', function () {
    $this->travelTo('2026-07-20 00:00:00');
    $laRiojaCity = City::factory()->inProvince(Province::LaRioja)->create();
    $firstInLaRioja = holidayFixture($laRiojaCity);
    $secondInLaRioja = holidayFixture($laRiojaCity);
    $inCordoba = holidayFixture(City::factory()->inProvince(Province::Cordoba)->create());
    $withoutAddress = holidayFixture();
    Holiday::factory()->inProvince(Province::LaRioja)->create(['date' => '2026-08-03']);

    // A single catalog row covers both La Rioja organizations.
    expect(Holiday::query()->count())->toBe(1);
    expect(slotsOn($firstInLaRioja, '2026-08-03'))->toBe([]);
    expect(slotsOn($secondInLaRioja, '2026-08-03'))->toBe([]);
    expect(slotsOn($inCordoba, '2026-08-03'))->toBe(allHolidayFixtureSlots());
    expect(slotsOn($withoutAddress, '2026-08-03'))->toBe(allHolidayFixtureSlots());
});

test('an organization own holiday suppresses slots only for that organization', function () {
    $this->travelTo('2026-07-20 00:00:00');
    $city = City::factory()->inProvince(Province::LaRioja)->create();
    $closed = holidayFixture($city);
    $neighbour = holidayFixture($city);
    OrganizationHoliday::factory()->create(['organization_id' => $closed[0]->id, 'date' => '2026-08-03']);

    expect(slotsOn($closed, '2026-08-03'))->toBe([]);
    expect(slotsOn($neighbour, '2026-08-03'))->toBe(allHolidayFixtureSlots());
});

test('an address without a city resolves no province, so only national holidays apply', function () {
    $this->travelTo('2026-07-20 00:00:00');
    $fixture = holidayFixture();
    Address::factory()->withoutCity()->create([
        'addressable_type' => Organization::class,
        'addressable_id' => $fixture[0]->id,
    ]);
    Holiday::factory()->inProvince(Province::LaRioja)->create(['date' => '2026-08-03']);
    Holiday::factory()->create(['date' => '2026-08-10']);

    expect(slotsOn($fixture, '2026-08-03'))->toBe(allHolidayFixtureSlots());
    expect(slotsOn($fixture, '2026-08-10'))->toBe([]);
});

test('a holiday on one day of a range only empties that day', function () {
    $this->travelTo('2026-07-20 00:00:00');
    [$organization, $membership, $service] = holidayFixture(City::factory()->inProvince(Province::LaRioja)->create());
    Holiday::factory()->inProvince(Province::LaRioja)->create(['date' => '2026-08-03']);

    $response = $this->getJson(slotsUrl($organization, $membership, $service, '2026-08-03', '2026-08-10'));

    $response->assertOk();
    expect(collect($response->json('data'))->pluck('start_at')->map(fn (string $start) => substr($start, 0, 10))->unique()->values()->all())
        ->toBe(['2026-08-10']);
});

test('a day with no holiday returns exactly the slots it returned before (regression guard)', function () {
    $this->travelTo('2026-07-20 00:00:00');
    $fixture = holidayFixture(City::factory()->inProvince(Province::LaRioja)->create());

    expect(slotsOn($fixture, '2026-08-03'))->toBe(allHolidayFixtureSlots());
});
