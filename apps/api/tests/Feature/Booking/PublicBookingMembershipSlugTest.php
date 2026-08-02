<?php

declare(strict_types=1);

use App\Enums\MembershipStatus;
use App\Models\Appointment;
use App\Models\Availability;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Patient;
use App\Models\ProfessionalService;
use App\Models\Service;
use Carbon\CarbonImmutable;

afterEach(function () {
    $this->travelBack();
});

test('show on a membership slug returns that professional only, with preselected_membership_id set', function () {
    $organization = Organization::factory()->create();
    $membership = Membership::factory()->professional()->create([
        'organization_id' => $organization->id,
        'slug' => 'dra-lopez',
    ]);
    Membership::factory()->professional()->create(['organization_id' => $organization->id]);

    $response = $this->getJson('/api/v1/booking/dra-lopez');

    $response->assertOk();
    expect($response->json('organization.slug'))->toBe($organization->slug);
    expect($response->json('professionals'))->toHaveCount(1);
    expect($response->json('professionals.0.membership_id'))->toBe($membership->id);
    expect($response->json('preselected_membership_id'))->toBe($membership->id);
});

test('a membership slug whose membership status is inactive or suspended returns 404', function () {
    Membership::factory()->professional()->create([
        'slug' => 'inactivo',
        'status' => MembershipStatus::Inactive,
    ]);
    Membership::factory()->professional()->create([
        'slug' => 'suspendido',
        'status' => MembershipStatus::Suspended,
    ]);

    $this->getJson('/api/v1/booking/inactivo')->assertStatus(404);
    $this->getJson('/api/v1/booking/suspendido')->assertStatus(404);
});

test('a membership slug whose membership is soft-deleted returns 404', function () {
    $membership = Membership::factory()->professional()->create(['slug' => 'borrado']);
    $membership->delete();

    $this->getJson('/api/v1/booking/borrado')->assertStatus(404);
});

test('a membership slug on a membership that does not hold the professional role returns 404', function () {
    $organization = Organization::factory()->create();
    // Slug set directly in the DB: SetMembershipSlugAction refuses to
    // create this state through the endpoint, so it's built here instead.
    Membership::factory()->staff()->create([
        'organization_id' => $organization->id,
        'slug' => 'no-profesional',
    ]);

    $this->getJson('/api/v1/booking/no-profesional')->assertStatus(404);
});

test('slots on a membership slug are scoped to that membership\'s organization', function () {
    $this->travelTo('2026-07-20 00:00:00');
    $organization = Organization::factory()->create(['timezone' => 'UTC']);
    $membership = Membership::factory()->professional()->create([
        'organization_id' => $organization->id,
        'slug' => 'dr-perez',
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
        'end_time' => '10:00:00',
    ]);

    $response = $this->getJson('/api/v1/booking/dr-perez/slots?'.http_build_query([
        'membership_id' => $membership->id,
        'service_id' => $service->id,
        'from' => '2026-08-03',
        'to' => '2026-08-03',
    ]));

    $response->assertOk();
    $slots = $response->json('data');
    expect($slots)->not->toBeEmpty();
    expect(CarbonImmutable::parse($slots[0]['start_at'])->format('H:i'))->toBe('09:00');
});

test('store on a membership slug creates the appointment in that membership\'s organization', function () {
    $this->travelTo('2026-07-20 00:00:00');
    $organization = Organization::factory()->create(['timezone' => 'UTC']);
    $membership = Membership::factory()->professional()->create([
        'organization_id' => $organization->id,
        'slug' => 'dr-gomez',
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

    $response = $this->postJson('/api/v1/booking/dr-gomez/appointments', [
        'membership_id' => $membership->id,
        'service_id' => $service->id,
        'start_at' => '2026-08-03T10:00:00',
        'patient' => [
            'name' => 'Juan Pérez',
            'document_type' => 'dni',
            'document_number' => '30111222',
            'email' => 'juan@example.com',
            'phone' => '1122334455',
        ],
    ]);

    $response->assertCreated();
    $appointment = Appointment::withoutGlobalScope('organization')
        ->where('membership_id', $membership->id)
        ->sole();
    expect($appointment->organization_id)->toBe($organization->id);
    expect(Patient::where('document_number', '30111222')->sole()->organizations()->whereKey($organization->id)->exists())
        ->toBeTrue();
});

test('a slug matching neither an organization nor a membership returns 404', function () {
    $this->getJson('/api/v1/booking/no-existe-ni-organizacion-ni-membresia')->assertStatus(404);
});
