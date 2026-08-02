<?php

declare(strict_types=1);

use App\Enums\MembershipStatus;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\ProfessionalService;
use App\Models\ProfessionalSpecialty;
use App\Models\Service;
use App\Models\Specialty;
use App\Models\User;

test('showing an unknown slug returns 404', function () {
    $this->getJson('/api/v1/booking/no-existe')->assertStatus(404);
});

test('a guest with no session gets 200: the endpoint requires no authentication', function () {
    $organization = Organization::factory()->create();

    $this->getJson("/api/v1/booking/{$organization->slug}")->assertOk();
});

test('show returns the organization basic data and its active professionals with specialties and active services', function () {
    $organization = Organization::factory()->create([
        'name' => 'Consultorio Salud',
        'slug' => 'consultorio-salud',
        'timezone' => 'America/Argentina/Buenos_Aires',
    ]);
    $membership = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $specialty = Specialty::factory()->create(['name' => 'Cardiología']);
    ProfessionalSpecialty::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'specialty_id' => $specialty->id,
    ]);
    $service = Service::factory()->create(['name' => 'Consulta']);
    ProfessionalService::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'service_id' => $service->id,
        'duration_minutes' => 30,
        'price_cents' => 5000,
        'currency' => 'ARS',
        'active' => true,
    ]);

    $response = $this->getJson("/api/v1/booking/{$organization->slug}");

    $response->assertOk();
    expect(array_keys($response->json()))->toEqualCanonicalizing(['organization', 'professionals', 'preselected_membership_id']);
    expect($response->json('preselected_membership_id'))->toBeNull();
    expect($response->json('organization'))->toBe([
        'name' => 'Consultorio Salud',
        'slug' => 'consultorio-salud',
        'timezone' => 'America/Argentina/Buenos_Aires',
    ]);
    expect($response->json('professionals'))->toHaveCount(1);
    $professional = $response->json('professionals.0');
    expect(array_keys($professional))->toEqualCanonicalizing(['membership_id', 'name', 'specialties', 'services']);
    expect($professional['membership_id'])->toBe($membership->id);
    expect($professional['name'])->toBe($membership->user->name);
    expect($professional['specialties'])->toBe([['id' => $specialty->id, 'name' => 'Cardiología']]);
    expect($professional['services'])->toBe([[
        'id' => $service->id,
        'name' => 'Consulta',
        'duration_minutes' => 30,
        'price_cents' => 5000,
        'currency' => 'ARS',
    ]]);
});

test('a membership with status inactive or suspended does not appear', function () {
    $organization = Organization::factory()->create();
    Membership::factory()->professional()->create([
        'organization_id' => $organization->id,
        'status' => MembershipStatus::Inactive,
    ]);
    Membership::factory()->professional()->create([
        'organization_id' => $organization->id,
        'status' => MembershipStatus::Suspended,
    ]);

    $response = $this->getJson("/api/v1/booking/{$organization->slug}");

    $response->assertOk();
    expect($response->json('professionals'))->toBe([]);
});

test('a membership without the professional role does not appear', function () {
    $organization = Organization::factory()->create();
    Membership::factory()->staff()->create(['organization_id' => $organization->id]);
    Membership::factory()->owner()->create(['organization_id' => $organization->id]);

    $response = $this->getJson("/api/v1/booking/{$organization->slug}");

    $response->assertOk();
    expect($response->json('professionals'))->toBe([]);
});

test('an inactive professional_services row is not listed; the active one is, with duration, price and currency', function () {
    $organization = Organization::factory()->create();
    $membership = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $activeService = Service::factory()->create(['name' => 'Consulta activa']);
    $inactiveService = Service::factory()->create(['name' => 'Consulta inactiva']);
    ProfessionalService::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'service_id' => $activeService->id,
        'duration_minutes' => 40,
        'price_cents' => 12345,
        'currency' => 'ARS',
        'active' => true,
    ]);
    ProfessionalService::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'service_id' => $inactiveService->id,
        'active' => false,
    ]);

    $response = $this->getJson("/api/v1/booking/{$organization->slug}");

    $response->assertOk();
    expect($response->json('professionals.0.services'))->toBe([[
        'id' => $activeService->id,
        'name' => 'Consulta activa',
        'duration_minutes' => 40,
        'price_cents' => 12345,
        'currency' => 'ARS',
    ]]);
});

test('the response never exposes a professional email or user_id', function () {
    $organization = Organization::factory()->create();
    $user = User::factory()->create(['email' => 'doctor.secreto@example.com']);
    Membership::factory()->professional()->create([
        'organization_id' => $organization->id,
        'user_id' => $user->id,
    ]);

    $response = $this->getJson("/api/v1/booking/{$organization->slug}");

    $response->assertOk();
    expect(array_keys($response->json('professionals.0')))->toEqualCanonicalizing(['membership_id', 'name', 'specialties', 'services']);
    expect($response->getContent())->not->toContain('doctor.secreto@example.com');
});

test("professionals, specialties and services from another organization never appear in this slug's response", function () {
    $organization = Organization::factory()->create();
    $otherOrganization = Organization::factory()->create();
    $otherMembership = Membership::factory()->professional()->create(['organization_id' => $otherOrganization->id]);
    $otherSpecialty = Specialty::factory()->create();
    ProfessionalSpecialty::factory()->create([
        'organization_id' => $otherOrganization->id,
        'membership_id' => $otherMembership->id,
        'specialty_id' => $otherSpecialty->id,
    ]);
    $otherService = Service::factory()->create();
    ProfessionalService::factory()->create([
        'organization_id' => $otherOrganization->id,
        'membership_id' => $otherMembership->id,
        'service_id' => $otherService->id,
        'active' => true,
    ]);

    $response = $this->getJson("/api/v1/booking/{$organization->slug}");

    $response->assertOk();
    expect($response->json('professionals'))->toBe([]);
});
