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

function validAnnulmentPayload(): array
{
    return ['reason' => 'Indicada por error.'];
}

test('a membership that is not the booked professional gets 403 on every endpoint', function (string $role) {
    $organization = Organization::factory()->center()->create();
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
    $this->actingAs($intruder->user)->postJson("/api/v1/prescriptions/{$prescription->id}/amendments", validPrescriptionPayload())
        ->assertStatus(403);
    $this->actingAs($intruder->user)->postJson("/api/v1/prescriptions/{$prescription->id}/annulment", validAnnulmentPayload())
        ->assertStatus(403);

    expect(Prescription::count())->toBe(1)
        ->and($prescription->annulment()->exists())->toBeFalse();
})->with(['professional', 'owner', 'admin', 'staff']);

// #359: the medication is part of the clinical history, read as the notes are; reading it never lets anyone else
// amend or annul it.
test('another professional who attended the patient sees the author\'s prescriptions in the patient listing, but cannot amend or annul them', function () {
    $organization = Organization::factory()->center()->create();
    $viewer = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $author = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $author->user->update(['name' => 'Dra. Autora']);
    $appointment = Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $author->id,
    ]);
    $prescription = Prescription::factory()->create(['appointment_id' => $appointment->id]);
    Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $viewer->id,
        'patient_id' => $appointment->patient_id,
        'start_at' => now()->subDay(),
        'end_at' => now()->subDay()->addMinutes(30),
    ]);

    $this->actingAs($viewer->user)->getJson("/api/v1/patients/{$appointment->patient_id}/prescriptions")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $prescription->id)
        ->assertJsonPath('data.0.membership_id', $author->id)
        ->assertJsonPath('data.0.author_name', 'Dra. Autora');

    $this->actingAs($viewer->user)->postJson("/api/v1/prescriptions/{$prescription->id}/amendments", validPrescriptionPayload())
        ->assertStatus(403);
    $this->actingAs($viewer->user)->postJson("/api/v1/prescriptions/{$prescription->id}/annulment", validAnnulmentPayload())
        ->assertStatus(403);
    expect($prescription->versions()->count())->toBe(1)
        ->and($prescription->annulment()->exists())->toBeFalse();
});

// #325: the patient listing opens to the same professionals as the notes, so the panel can know ahead of the read.
test('the patient listing is forbidden to whoever never attended the patient, never decided by role', function (string $role) {
    $organization = Organization::factory()->center()->create();
    $intruder = Membership::factory()->{$role}()->create(['organization_id' => $organization->id]);
    $author = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $appointment = Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $author->id,
    ]);
    Prescription::factory()->create(['appointment_id' => $appointment->id]);

    $this->actingAs($intruder->user)->getJson("/api/v1/patients/{$appointment->patient_id}/prescriptions")
        ->assertForbidden();
})->with(['professional', 'owner', 'admin', 'staff']);

// One HTTP call per test: see ClinicalNoteAuthorizationTest for why
// CurrentOrganization surviving across simulated requests matters here.
test('a prescription belonging to another organization returns 403 on amend', function () {
    $membership = Membership::factory()->onPaidPlan()->create();
    $prescription = Prescription::factory()->create();

    $this->actingAs($membership->user)->postJson("/api/v1/prescriptions/{$prescription->id}/amendments", validPrescriptionPayload())
        ->assertStatus(403);
});

test('a prescription belonging to another organization returns 403 on annul', function () {
    $membership = Membership::factory()->onPaidPlan()->create();
    $prescription = Prescription::factory()->create();

    $this->actingAs($membership->user)->postJson("/api/v1/prescriptions/{$prescription->id}/annulment", validAnnulmentPayload())
        ->assertStatus(403);

    expect($prescription->annulment()->exists())->toBeFalse();
});

test('another organization\'s prescriptions never leak into the patient listing', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $prescription = Prescription::factory()->create();
    Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'patient_id' => $prescription->patient_id,
        'start_at' => now()->addDay(),
        'end_at' => now()->addDay()->addMinutes(30),
    ]);

    $this->actingAs($membership->user)->getJson("/api/v1/patients/{$prescription->patient_id}/prescriptions")
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

test('a guest gets 401 on every endpoint', function () {
    $prescription = Prescription::factory()->create();

    $this->getJson("/api/v1/appointments/{$prescription->appointment_id}/prescriptions")->assertStatus(401);
    $this->postJson("/api/v1/appointments/{$prescription->appointment_id}/prescriptions", validPrescriptionPayload())->assertStatus(401);
    $this->getJson("/api/v1/patients/{$prescription->patient_id}/prescriptions")->assertStatus(401);
    $this->postJson("/api/v1/prescriptions/{$prescription->id}/amendments", validPrescriptionPayload())->assertStatus(401);
    $this->postJson("/api/v1/prescriptions/{$prescription->id}/annulment", validAnnulmentPayload())->assertStatus(401);
});
