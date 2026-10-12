<?php

declare(strict_types=1);

use App\Models\Appointment;
use App\Models\Availability;
use App\Models\InsuranceProvider;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Patient;
use App\Models\ProfessionalService;
use App\Models\Service;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

/**
 * @return array{0: Organization, 1: Membership, 2: Service}
 */
function insuranceBookingFixture(): array
{
    $organization = Organization::factory()->create(['timezone' => 'UTC']);
    $membership = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
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
 * @param  array<string, mixed>  $patient
 * @return array<string, mixed>
 */
function insuranceBookingPayload(Membership $membership, Service $service, array $patient = []): array
{
    return [
        'membership_id' => $membership->id,
        'service_id' => $service->id,
        'start_at' => '2026-08-03T10:00:00Z',
        'patient' => array_merge([
            'name' => 'Juan Pérez',
            'document_type' => 'dni',
            'document_number' => '30111222',
        ], $patient),
    ];
}

function bookedAppointment(Membership $membership): Appointment
{
    return Appointment::withoutGlobalScope('organization')->where('membership_id', $membership->id)->sole();
}

test('the booking page lists only the insurance providers the practice accepts, by name', function () {
    [$organization] = insuranceBookingFixture();
    $osde = InsuranceProvider::factory()->create(['name' => 'OSDE']);
    $galeno = InsuranceProvider::factory()->create(['name' => 'Galeno']);
    InsuranceProvider::factory()->create(['name' => 'IOMA']);
    $organization->acceptedInsuranceProviders()->attach([$osde->id, $galeno->id]);

    $this->getJson("/api/v1/booking/{$organization->slug}")
        ->assertOk()
        ->assertJsonPath('insurance_providers', [
            ['id' => $galeno->id, 'name' => 'Galeno'],
            ['id' => $osde->id, 'name' => 'OSDE'],
        ]);
});

test('a practice that accepts no insurance provider offers none', function () {
    [$organization] = insuranceBookingFixture();
    InsuranceProvider::factory()->create();

    $this->getJson("/api/v1/booking/{$organization->slug}")
        ->assertOk()
        ->assertJsonPath('insurance_providers', []);
});

test('the reported insurance and member number are kept on the appointment, not on a new patient', function () {
    $this->travelTo('2026-07-20 00:00:00');
    [$organization, $membership, $service] = insuranceBookingFixture();
    $osde = InsuranceProvider::factory()->create();
    $organization->acceptedInsuranceProviders()->attach($osde->id);

    $this->postJson("/api/v1/booking/{$organization->slug}/appointments", insuranceBookingPayload($membership, $service, [
        'insurance_provider_id' => $osde->id,
        'insurance_member_number' => '123 456/01',
    ]))->assertCreated();

    $appointment = bookedAppointment($membership);
    expect($appointment->reported_insurance_provider_id)->toBe($osde->id)
        ->and($appointment->reported_insurance_member_number)->toBe('123 456/01');

    $patient = Patient::query()->where('document_number', '30111222')->sole();
    expect($patient->insurance_provider_id)->toBeNull()
        ->and($patient->insurance_member_number)->toBeNull();
});

test('an existing patient keeps the insurance the practice recorded when they report another one', function () {
    $this->travelTo('2026-07-20 00:00:00');
    [$organization, $membership, $service] = insuranceBookingFixture();
    [$recorded, $reported] = InsuranceProvider::factory()->count(2)->create();
    $organization->acceptedInsuranceProviders()->attach($reported->id);
    $patient = Patient::factory()->create([
        'document_type' => 'dni',
        'document_number' => '30111222',
        'insurance_provider_id' => $recorded->id,
        'insurance_member_number' => 'A-1',
    ]);

    $this->postJson("/api/v1/booking/{$organization->slug}/appointments", insuranceBookingPayload($membership, $service, [
        'insurance_provider_id' => $reported->id,
        'insurance_member_number' => 'B-2',
    ]))->assertCreated();

    expect($patient->fresh())
        ->insurance_provider_id->toBe($recorded->id)
        ->insurance_member_number->toBe('A-1');
    expect(bookedAppointment($membership))
        ->reported_insurance_provider_id->toBe($reported->id)
        ->reported_insurance_member_number->toBe('B-2');
});

test('a member number already held by another patient of that provider does not reject the booking', function () {
    $this->travelTo('2026-07-20 00:00:00');
    [$organization, $membership, $service] = insuranceBookingFixture();
    $osde = InsuranceProvider::factory()->create();
    $organization->acceptedInsuranceProviders()->attach($osde->id);
    Patient::factory()->create(['insurance_provider_id' => $osde->id, 'insurance_member_number' => '999']);

    $this->postJson("/api/v1/booking/{$organization->slug}/appointments", insuranceBookingPayload($membership, $service, [
        'insurance_provider_id' => $osde->id,
        'insurance_member_number' => '999',
    ]))->assertCreated();
});

test('a provider the practice does not accept is rejected with 422 and books nothing', function () {
    $this->travelTo('2026-07-20 00:00:00');
    [$organization, $membership, $service] = insuranceBookingFixture();
    [$accepted, $other] = InsuranceProvider::factory()->count(2)->create();
    $organization->acceptedInsuranceProviders()->attach($accepted->id);
    // Accepted elsewhere, which must not count here.
    Organization::factory()->create()->acceptedInsuranceProviders()->attach($other->id);

    $this->postJson("/api/v1/booking/{$organization->slug}/appointments", insuranceBookingPayload($membership, $service, [
        'insurance_provider_id' => $other->id,
        'insurance_member_number' => '123',
    ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['patient.insurance_provider_id' => 'El consultorio no atiende esa obra social.']);

    expect(Appointment::withoutGlobalScope('organization')->count())->toBe(0);
});

test('a provider without a member number is rejected with 422', function (?string $memberNumber) {
    $this->travelTo('2026-07-20 00:00:00');
    [$organization, $membership, $service] = insuranceBookingFixture();
    $osde = InsuranceProvider::factory()->create();
    $organization->acceptedInsuranceProviders()->attach($osde->id);

    $this->postJson("/api/v1/booking/{$organization->slug}/appointments", insuranceBookingPayload($membership, $service, [
        'insurance_provider_id' => $osde->id,
        'insurance_member_number' => $memberNumber,
    ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['patient.insurance_member_number']);
})->with([null, '', ' / - ']);

test('a member number without a provider is dropped', function () {
    $this->travelTo('2026-07-20 00:00:00');
    [$organization, $membership, $service] = insuranceBookingFixture();

    $this->postJson("/api/v1/booking/{$organization->slug}/appointments", insuranceBookingPayload($membership, $service, [
        'insurance_provider_id' => null,
        'insurance_member_number' => '123',
    ]))->assertCreated();

    expect(bookedAppointment($membership))
        ->reported_insurance_provider_id->toBeNull()
        ->reported_insurance_member_number->toBeNull();
});

test('the agenda shows the reported insurance, and a reschedule carries it over', function () {
    $this->travelTo('2026-07-20 00:00:00');
    [$organization, $membership, $service] = insuranceBookingFixture();
    $osde = InsuranceProvider::factory()->create(['name' => 'OSDE']);
    $organization->acceptedInsuranceProviders()->attach($osde->id);

    $this->postJson("/api/v1/booking/{$organization->slug}/appointments", insuranceBookingPayload($membership, $service, [
        'insurance_provider_id' => $osde->id,
        'insurance_member_number' => '123',
    ]))->assertCreated();
    $original = bookedAppointment($membership);
    app(CurrentOrganization::class)->set(null);

    $this->actingAs($membership->user)
        ->getJson('/api/v1/appointments?from=2026-08-01T00:00:00Z&to=2026-08-31T00:00:00Z')
        ->assertOk()
        ->assertJsonPath('data.0.reported_insurance_provider_id', $osde->id)
        ->assertJsonPath('data.0.reported_insurance_provider_name', 'OSDE')
        ->assertJsonPath('data.0.reported_insurance_member_number', '123');

    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$original->id}/reschedule", ['start_at' => '2026-08-03T11:00:00Z'])
        ->assertSuccessful()
        ->assertJsonPath('data.reported_insurance_provider_name', 'OSDE')
        ->assertJsonPath('data.reported_insurance_member_number', '123');
});
