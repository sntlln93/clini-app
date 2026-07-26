<?php

declare(strict_types=1);

use App\Models\Availability;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Patient;
use App\Models\Service;
use App\Models\Specialty;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('the global scope no-ops when no organization is set', function () {
    $organizationA = Organization::factory()->create();
    $organizationB = Organization::factory()->create();

    Availability::factory()->create(['organization_id' => $organizationA->id]);
    Availability::factory()->create(['organization_id' => $organizationB->id]);

    expect(Availability::all())->toHaveCount(2);
});

test('the global scope filters by the current organization', function () {
    $organizationA = Organization::factory()->create();
    $organizationB = Organization::factory()->create();

    Availability::factory()->create(['organization_id' => $organizationA->id]);
    Availability::factory()->create(['organization_id' => $organizationB->id]);

    app(CurrentOrganization::class)->set($organizationA->id);

    $availabilities = Availability::all();

    expect($availabilities)->toHaveCount(1);
    expect($availabilities->first()->organization_id)->toBe($organizationA->id);
});

test('creating without an organization_id auto-fills it from the current organization', function () {
    $organizationA = Organization::factory()->create();
    $membership = Membership::factory()->create(['organization_id' => $organizationA->id]);

    app(CurrentOrganization::class)->set($organizationA->id);

    $availability = Availability::create([
        'membership_id' => $membership->id,
        'day_of_week' => 1,
        'start_time' => '09:00:00',
        'end_time' => '17:00:00',
    ]);

    expect($availability->fresh()->organization_id)->toBe($organizationA->id);
});

test('patients are not tenant-scoped', function () {
    $organizationA = Organization::factory()->create();

    Patient::factory()->create();
    Patient::factory()->create();

    app(CurrentOrganization::class)->set($organizationA->id);

    expect(Patient::all())->toHaveCount(2);
});

test('specialties are not tenant-scoped', function () {
    $organizationA = Organization::factory()->create();

    Specialty::factory()->create();
    Specialty::factory()->create();

    app(CurrentOrganization::class)->set($organizationA->id);

    expect(Specialty::all())->toHaveCount(2);
});

test('services are not tenant-scoped', function () {
    $organizationA = Organization::factory()->create();

    Service::factory()->create();
    Service::factory()->create();

    app(CurrentOrganization::class)->set($organizationA->id);

    expect(Service::all())->toHaveCount(2);
});
