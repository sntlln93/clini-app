<?php

declare(strict_types=1);

use App\Models\Appointment;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Prescription;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

function validPrescriptionPayload(): array
{
    return [
        'items' => [
            ['medication' => 'Amoxicilina', 'dosage' => '1 cada 8 h', 'quantity' => 1],
        ],
    ];
}

test('a membership that is not the booked professional gets 403 on every endpoint', function (string $role) {
    $organization = Organization::factory()->create();
    $intruder = Membership::factory()->{$role}()->create(['organization_id' => $organization->id]);
    $author = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $appointment = Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $author->id,
    ]);
    $prescription = Prescription::factory()->create(['appointment_id' => $appointment->id]);

    $this->actingAs($intruder->user)->getJson("/api/v1/appointments/{$appointment->id}/prescriptions")
        ->assertStatus(403);
    $this->actingAs($intruder->user)->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", validPrescriptionPayload())
        ->assertStatus(403);
    $this->actingAs($intruder->user)->getJson("/api/v1/prescriptions/{$prescription->id}")
        ->assertStatus(403);
    $this->actingAs($intruder->user)->patchJson("/api/v1/prescriptions/{$prescription->id}", validPrescriptionPayload())
        ->assertStatus(403);

    expect(Prescription::count())->toBe(1);
})->with(['professional', 'owner', 'admin', 'staff']);

test('another professional of the same organization does not see the author\'s prescriptions in the patient listing', function () {
    $organization = Organization::factory()->create();
    $viewer = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $author = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $appointment = Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $author->id,
    ]);
    Prescription::factory()->create(['appointment_id' => $appointment->id]);

    $this->actingAs($viewer->user)->getJson("/api/v1/patients/{$appointment->patient_id}/prescriptions")
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

// One HTTP call per test: see ClinicalNoteAuthorizationTest for why
// CurrentOrganization surviving across simulated requests matters here.
test('a prescription belonging to another organization returns 403 on show', function () {
    $membership = Membership::factory()->create();
    $prescription = Prescription::factory()->create();

    $this->actingAs($membership->user)->getJson("/api/v1/prescriptions/{$prescription->id}")
        ->assertStatus(403);
});

test('a prescription belonging to another organization returns 403 on update', function () {
    $membership = Membership::factory()->create();
    $prescription = Prescription::factory()->create();

    $this->actingAs($membership->user)->patchJson("/api/v1/prescriptions/{$prescription->id}", validPrescriptionPayload())
        ->assertStatus(403);
});

test('another organization\'s prescriptions never leak into the patient listing', function () {
    $membership = Membership::factory()->create();
    $prescription = Prescription::factory()->create();

    $this->actingAs($membership->user)->getJson("/api/v1/patients/{$prescription->patient_id}/prescriptions")
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

test('a guest gets 401 on every endpoint', function () {
    $prescription = Prescription::factory()->create();

    $this->getJson("/api/v1/appointments/{$prescription->appointment_id}/prescriptions")->assertStatus(401);
    $this->postJson("/api/v1/appointments/{$prescription->appointment_id}/prescriptions", validPrescriptionPayload())->assertStatus(401);
    $this->getJson("/api/v1/patients/{$prescription->patient_id}/prescriptions")->assertStatus(401);
    $this->getJson("/api/v1/prescriptions/{$prescription->id}")->assertStatus(401);
    $this->patchJson("/api/v1/prescriptions/{$prescription->id}", validPrescriptionPayload())->assertStatus(401);
});
