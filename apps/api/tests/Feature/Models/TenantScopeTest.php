<?php

declare(strict_types=1);

use App\Models\Organization;
use App\Models\Patient;
use App\Models\Service;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('the global scope no-ops when no organization is set', function () {
    $organizationA = Organization::factory()->create();
    $organizationB = Organization::factory()->create();

    Service::factory()->create(['organization_id' => $organizationA->id]);
    Service::factory()->create(['organization_id' => $organizationB->id]);

    expect(Service::all())->toHaveCount(2);
});

test('the global scope filters by the current organization', function () {
    $organizationA = Organization::factory()->create();
    $organizationB = Organization::factory()->create();

    Service::factory()->create(['organization_id' => $organizationA->id]);
    Service::factory()->create(['organization_id' => $organizationB->id]);

    app(CurrentOrganization::class)->set($organizationA->id);

    $services = Service::all();

    expect($services)->toHaveCount(1);
    expect($services->first()->organization_id)->toBe($organizationA->id);
});

test('creating without an organization_id auto-fills it from the current organization', function () {
    $organizationA = Organization::factory()->create();

    app(CurrentOrganization::class)->set($organizationA->id);

    $service = Service::create([
        'name' => 'Consulta general',
        'duration_minutes' => 30,
        'currency' => 'ARS',
        'active' => true,
    ]);

    expect($service->fresh()->organization_id)->toBe($organizationA->id);
});

test('patients are not tenant-scoped', function () {
    $organizationA = Organization::factory()->create();

    Patient::factory()->create();
    Patient::factory()->create();

    app(CurrentOrganization::class)->set($organizationA->id);

    expect(Patient::all())->toHaveCount(2);
});
