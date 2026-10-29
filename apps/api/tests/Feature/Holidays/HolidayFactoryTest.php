<?php

declare(strict_types=1);

use App\Models\Holiday;
use App\Models\Organization;
use App\Models\OrganizationHoliday;

// Unique by day, not by instant: two instants of the same day used to collide
// on the date's unique key and fail a factory batch now and then.

test('national holidays from the factory never share a day', function () {
    $holidays = Holiday::factory()->count(200)->create();

    expect($holidays->pluck('date')->map->toDateString()->unique())->toHaveCount(200);
});

test('an organization\'s holidays from the factory never share a day', function () {
    $organization = Organization::factory()->create();

    $holidays = OrganizationHoliday::factory()->count(200)->for($organization)->create();

    expect($holidays->pluck('date')->map->toDateString()->unique())->toHaveCount(200);
});
