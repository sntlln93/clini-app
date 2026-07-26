<?php

declare(strict_types=1);

use App\Models\Appointment;
use App\Models\Availability;
use App\Models\AvailabilityException;
use App\Models\Organization;
use App\Models\ProfessionalService;
use App\Models\ProfessionalSpecialty;
use App\Models\Reminder;

/**
 * Map of factory class => organization-owned relations to check, per the
 * factory graphs fixed in 8e2bd2b (fix/9-factory-tenant-coherence).
 *
 * `service` and `specialty` are deliberately absent from the Appointment/
 * ProfessionalService/ProfessionalSpecialty entries: since issue #21,
 * Service and Specialty are a global catalog with no organization_id, so
 * they no longer belong in an organization-owned coherence check.
 */
dataset('tenantOwnedFactories', [
    'Appointment' => [Appointment::class, ['membership']],
    'ProfessionalService' => [ProfessionalService::class, ['membership']],
    'ProfessionalSpecialty' => [ProfessionalSpecialty::class, ['membership']],
    'Availability' => [Availability::class, ['membership']],
    'AvailabilityException' => [AvailabilityException::class, ['membership']],
    'Reminder' => [Reminder::class, ['appointment']],
]);

test('create() without arguments keeps every organization-owned relation aligned with the entity', function (string $modelClass, array $relations) {
    $entity = $modelClass::factory()->create();

    foreach ($relations as $relation) {
        expect($entity->{$relation}->organization_id)->toBe($entity->organization_id);
    }
})->with('tenantOwnedFactories');

test('create() with a preexisting organization reuses it across the whole factory graph without creating a new one', function (string $modelClass, array $relations) {
    $organization = Organization::factory()->create();
    $organizationCountBefore = Organization::count();

    $entity = $modelClass::factory()->create(['organization_id' => $organization->id]);

    expect($entity->organization_id)->toBe($organization->id);

    foreach ($relations as $relation) {
        expect($entity->{$relation}->organization_id)->toBe($organization->id);
    }

    expect(Organization::count())->toBe($organizationCountBefore);
})->with('tenantOwnedFactories');

test('create() without arguments creates exactly one new organization per call', function (string $modelClass) {
    $organizationCountBefore = Organization::count();

    $modelClass::factory()->create();

    expect(Organization::count())->toBe($organizationCountBefore + 1);
})->with('tenantOwnedFactories');
