<?php

declare(strict_types=1);

use App\Enums\AppointmentOrigin;
use App\Enums\AppointmentStatus;
use App\Enums\DocumentType;
use App\Enums\ErrorCode;
use App\Models\Appointment;
use App\Models\Availability;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Patient;
use App\Models\ProfessionalService;
use App\Models\Service;

/**
 * UTC timezone keeps every plain (no offset) date/time string below
 * unambiguous across the payload, weekly availability and appointments.
 *
 * @return array{0: Organization, 1: Membership, 2: Service, 3: ProfessionalService}
 */
function createOnlineBookingFixture(int $durationMinutes = 30): array
{
    $organization = Organization::factory()->create(['timezone' => 'UTC']);
    $membership = Membership::factory()->create(['organization_id' => $organization->id]);
    $service = Service::factory()->create();
    $professionalService = ProfessionalService::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'service_id' => $service->id,
        'duration_minutes' => $durationMinutes,
        'active' => true,
    ]);
    Availability::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'day_of_week' => 1,
        'start_time' => '09:00:00',
        'end_time' => '17:00:00',
    ]);

    return [$organization, $membership, $service, $professionalService];
}

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function bookingPatientPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Juan Pérez',
        'document_type' => 'dni',
        'document_number' => fake()->unique()->numerify('########'),
        'email' => 'juan@example.com',
        'phone' => '1122334455',
    ], $overrides);
}

test('store creates the appointment online, unauthenticated, with a derived end_at and a null created_by', function () {
    $this->travelTo('2026-07-20 00:00:00');
    [$organization, $membership, $service] = createOnlineBookingFixture(45);

    $response = $this->postJson("/api/v1/booking/{$organization->slug}/appointments", [
        'membership_id' => $membership->id,
        'service_id' => $service->id,
        'start_at' => '2026-08-03T10:00:00',
        'patient' => bookingPatientPayload(),
    ]);

    $response->assertCreated();
    $appointment = Appointment::withoutGlobalScope('organization')
        ->where('membership_id', $membership->id)
        ->sole();

    expect($appointment->origin)->toBe(AppointmentOrigin::Online);
    expect($appointment->created_by)->toBeNull();
    expect($appointment->status)->toBe(AppointmentStatus::Scheduled);
    expect($appointment->start_at->format('Y-m-d H:i'))->toBe('2026-08-03 10:00');
    expect($appointment->end_at->format('Y-m-d H:i'))->toBe('2026-08-03 10:45');
});

test('store with an unknown document_number creates the patient and links it to the organization from the slug', function () {
    $this->travelTo('2026-07-20 00:00:00');
    [$organization, $membership, $service] = createOnlineBookingFixture();
    $documentNumber = fake()->unique()->numerify('########');

    $response = $this->postJson("/api/v1/booking/{$organization->slug}/appointments", [
        'membership_id' => $membership->id,
        'service_id' => $service->id,
        'start_at' => '2026-08-03T10:00:00',
        'patient' => bookingPatientPayload(['document_number' => $documentNumber]),
    ]);

    $response->assertCreated();
    $patient = Patient::where('document_number', $documentNumber)->sole();
    expect($patient->organizations()->whereKey($organization->id)->exists())->toBeTrue();
});

test('store with an already-existing document_number reuses the patient without duplicating it, and links it to the organization', function () {
    $this->travelTo('2026-07-20 00:00:00');
    [$organization, $membership, $service] = createOnlineBookingFixture();
    $existingPatient = Patient::factory()->create([
        'document_type' => DocumentType::Dni,
        'document_number' => '30999888',
    ]);

    $response = $this->postJson("/api/v1/booking/{$organization->slug}/appointments", [
        'membership_id' => $membership->id,
        'service_id' => $service->id,
        'start_at' => '2026-08-03T10:00:00',
        'patient' => bookingPatientPayload(['document_number' => '30999888']),
    ]);

    $response->assertCreated();
    expect(Patient::where('document_number', '30999888')->count())->toBe(1);
    expect($existingPatient->organizations()->whereKey($organization->id)->exists())->toBeTrue();
});

test('store with a start_at outside the published schedule returns 409 booking.slot_not_available and creates no appointment', function () {
    $this->travelTo('2026-07-20 00:00:00');
    [$organization, $membership, $service] = createOnlineBookingFixture();

    // Monday's only availability is 09:00-17:00; 20:00 falls outside it entirely (not merely taken).
    $response = $this->postJson("/api/v1/booking/{$organization->slug}/appointments", [
        'membership_id' => $membership->id,
        'service_id' => $service->id,
        'start_at' => '2026-08-03T20:00:00',
        'patient' => bookingPatientPayload(),
    ]);

    $response->assertStatus(409)->assertJsonPath('error.code', ErrorCode::BookingSlotNotAvailable->value);
    expect(Appointment::withoutGlobalScope('organization')->count())->toBe(0);
});

test('store with a start_at within the published schedule but already taken returns 409 appointments.slot_taken — a different code than the published-schedule case', function () {
    $this->travelTo('2026-07-20 00:00:00');
    [$organization, $membership, $service] = createOnlineBookingFixture();
    Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'service_id' => $service->id,
        'status' => AppointmentStatus::Scheduled,
        'start_at' => '2026-08-03 10:00:00',
        'end_at' => '2026-08-03 10:30:00',
    ]);

    $response = $this->postJson("/api/v1/booking/{$organization->slug}/appointments", [
        'membership_id' => $membership->id,
        'service_id' => $service->id,
        'start_at' => '2026-08-03T10:00:00',
        'patient' => bookingPatientPayload(),
    ]);

    expect(ErrorCode::AppointmentsSlotTaken->value)->not->toBe(ErrorCode::BookingSlotNotAvailable->value);
    $response->assertStatus(409)->assertJsonPath('error.code', ErrorCode::AppointmentsSlotTaken->value);
    expect(Appointment::withoutGlobalScope('organization')->count())->toBe(1);
});

test('store with a start_at in the past returns 422 and creates no appointment', function () {
    $this->travelTo('2026-08-03 12:00:00');
    [$organization, $membership, $service] = createOnlineBookingFixture();

    $response = $this->postJson("/api/v1/booking/{$organization->slug}/appointments", [
        'membership_id' => $membership->id,
        'service_id' => $service->id,
        'start_at' => '2026-08-03T10:00:00',
        'patient' => bookingPatientPayload(),
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors('start_at');
    expect(Appointment::withoutGlobalScope('organization')->count())->toBe(0);
});

test('store with a start_at beyond the 60-day booking window returns 422', function () {
    $this->travelTo('2026-07-20 00:00:00');
    [$organization, $membership, $service] = createOnlineBookingFixture();

    // 2026-10-19 is a Monday (matches the availability) 91 days out — past BOOKING_WINDOW_DAYS (60) and not otherwise taken, so only the booking-window check can reject it.
    $response = $this->postJson("/api/v1/booking/{$organization->slug}/appointments", [
        'membership_id' => $membership->id,
        'service_id' => $service->id,
        'start_at' => '2026-10-19T10:00:00',
        'patient' => bookingPatientPayload(),
    ]);

    $response->assertStatus(422);
    expect(Appointment::withoutGlobalScope('organization')->count())->toBe(0);
});

test('store with patient.name or patient.document_number missing, or an invalid document_type, returns 422', function () {
    $this->travelTo('2026-07-20 00:00:00');
    [$organization, $membership, $service] = createOnlineBookingFixture();

    $this->postJson("/api/v1/booking/{$organization->slug}/appointments", [
        'membership_id' => $membership->id,
        'service_id' => $service->id,
        'start_at' => '2026-08-03T10:00:00',
        'patient' => bookingPatientPayload(['name' => '']),
    ])->assertStatus(422)->assertJsonValidationErrors('patient.name');

    $this->postJson("/api/v1/booking/{$organization->slug}/appointments", [
        'membership_id' => $membership->id,
        'service_id' => $service->id,
        'start_at' => '2026-08-03T11:00:00',
        'patient' => bookingPatientPayload(['document_number' => '']),
    ])->assertStatus(422)->assertJsonValidationErrors('patient.document_number');

    $this->postJson("/api/v1/booking/{$organization->slug}/appointments", [
        'membership_id' => $membership->id,
        'service_id' => $service->id,
        'start_at' => '2026-08-03T12:00:00',
        'patient' => bookingPatientPayload(['document_type' => 'not-a-real-type']),
    ])->assertStatus(422)->assertJsonValidationErrors('patient.document_type');

    expect(Appointment::withoutGlobalScope('organization')->count())->toBe(0);
});

test('the 201 confirmation response exposes only confirmation data, no internal patient or appointment identifiers', function () {
    $this->travelTo('2026-07-20 00:00:00');
    [$organization, $membership, $service] = createOnlineBookingFixture();

    $response = $this->postJson("/api/v1/booking/{$organization->slug}/appointments", [
        'membership_id' => $membership->id,
        'service_id' => $service->id,
        'start_at' => '2026-08-03T10:00:00',
        'patient' => bookingPatientPayload(),
    ]);

    $response->assertCreated();
    expect(array_keys($response->json('data')))->toEqualCanonicalizing([
        'start_at', 'end_at', 'professional_name', 'service_name', 'organization_name',
    ]);
    expect($response->json('data.professional_name'))->toBe($membership->user->name);
    expect($response->json('data.service_name'))->toBe($service->name);
    expect($response->json('data.organization_name'))->toBe($organization->name);
});

test('store with a membership_id from another organization returns 404 and creates no appointment or patient', function () {
    $this->travelTo('2026-07-20 00:00:00');
    [$organization, , $service] = createOnlineBookingFixture();
    $otherOrganization = Organization::factory()->create(['timezone' => 'UTC']);
    $otherMembership = Membership::factory()->create(['organization_id' => $otherOrganization->id]);
    ProfessionalService::factory()->create([
        'organization_id' => $otherOrganization->id,
        'membership_id' => $otherMembership->id,
        'service_id' => $service->id,
        'duration_minutes' => 30,
        'active' => true,
    ]);

    $response = $this->postJson("/api/v1/booking/{$organization->slug}/appointments", [
        'membership_id' => $otherMembership->id,
        'service_id' => $service->id,
        'start_at' => '2026-08-03T10:00:00',
        'patient' => bookingPatientPayload(),
    ]);

    $response->assertStatus(404);
    expect(Appointment::withoutGlobalScope('organization')->count())->toBe(0);
    expect(Patient::count())->toBe(0);
});

test('store with a service not active for the professional returns 409 appointments.service_not_active_for_professional', function () {
    $this->travelTo('2026-07-20 00:00:00');
    $organization = Organization::factory()->create(['timezone' => 'UTC']);
    $membership = Membership::factory()->create(['organization_id' => $organization->id]);
    $service = Service::factory()->create();
    ProfessionalService::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'service_id' => $service->id,
        'duration_minutes' => 30,
        'active' => false,
    ]);
    Availability::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'day_of_week' => 1,
        'start_time' => '09:00:00',
        'end_time' => '17:00:00',
    ]);

    $response = $this->postJson("/api/v1/booking/{$organization->slug}/appointments", [
        'membership_id' => $membership->id,
        'service_id' => $service->id,
        'start_at' => '2026-08-03T10:00:00',
        'patient' => bookingPatientPayload(),
    ]);

    $response->assertStatus(409)->assertJsonPath('error.code', ErrorCode::AppointmentsServiceNotActiveForProfessional->value);
    expect(Appointment::withoutGlobalScope('organization')->count())->toBe(0);
});
