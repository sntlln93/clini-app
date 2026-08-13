<?php

declare(strict_types=1);

use App\Models\Appointment;
use App\Models\ClinicalNote;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Patient;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('a professional who has a past appointment with the patient gets 200 and sees a note authored by a different membership of the same organization', function () {
    $organization = Organization::factory()->create();
    $patient = Patient::factory()->create();
    $viewer = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $viewer->id,
        'patient_id' => $patient->id,
        'start_at' => now()->subDays(3),
        'end_at' => now()->subDays(3)->addMinutes(30),
    ]);

    $author = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $authorAppointment = Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $author->id,
        'patient_id' => $patient->id,
    ]);
    ClinicalNote::factory()->create([
        'appointment_id' => $authorAppointment->id,
        'organization_id' => $organization->id,
        'membership_id' => $author->id,
        'body' => 'Nota escrita por otro profesional.',
    ]);

    $response = $this->actingAs($viewer->user)->getJson("/api/v1/patients/{$patient->id}/clinical-notes");

    $response->assertOk();
    expect($response->json('data.0.body'))->toBe('Nota escrita por otro profesional.');
});

test('the author of a note gets 200 and sees their own note even without any appointment with the patient', function () {
    $organization = Organization::factory()->create();
    $patient = Patient::factory()->create();
    $otherProfessional = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $appointment = Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $otherProfessional->id,
        'patient_id' => $patient->id,
    ]);

    $author = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    ClinicalNote::factory()->create([
        'appointment_id' => $appointment->id,
        'organization_id' => $organization->id,
        'membership_id' => $author->id,
        'body' => 'Nota propia sin turno con el paciente.',
    ]);

    $response = $this->actingAs($author->user)->getJson("/api/v1/patients/{$patient->id}/clinical-notes");

    $response->assertOk();
    expect($response->json('data.0.body'))->toBe('Nota propia sin turno con el paciente.');
});

test('a professional with neither an appointment nor a note with that patient gets 403', function () {
    $organization = Organization::factory()->create();
    $patient = Patient::factory()->create();
    $unrelated = Membership::factory()->professional()->create(['organization_id' => $organization->id]);

    $this->actingAs($unrelated->user)->getJson("/api/v1/patients/{$patient->id}/clinical-notes")
        ->assertStatus(403);
});

test('notes belonging to another organization are never returned', function () {
    $organizationA = Organization::factory()->create();
    $organizationB = Organization::factory()->create();
    $patient = Patient::factory()->create();

    $membershipA = Membership::factory()->professional()->create(['organization_id' => $organizationA->id]);
    $appointmentA = Appointment::factory()->create([
        'organization_id' => $organizationA->id,
        'membership_id' => $membershipA->id,
        'patient_id' => $patient->id,
    ]);
    ClinicalNote::factory()->create([
        'appointment_id' => $appointmentA->id,
        'organization_id' => $organizationA->id,
        'membership_id' => $membershipA->id,
        'body' => 'Nota de la organización A.',
    ]);

    $membershipB = Membership::factory()->professional()->create(['organization_id' => $organizationB->id]);
    $appointmentB = Appointment::factory()->create([
        'organization_id' => $organizationB->id,
        'membership_id' => $membershipB->id,
        'patient_id' => $patient->id,
    ]);
    ClinicalNote::factory()->create([
        'appointment_id' => $appointmentB->id,
        'organization_id' => $organizationB->id,
        'membership_id' => $membershipB->id,
        'body' => 'Nota de la organización B.',
    ]);

    $response = $this->actingAs($membershipA->user)->getJson("/api/v1/patients/{$patient->id}/clinical-notes");

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(1);
    expect($response->json('data.0.body'))->toBe('Nota de la organización A.');
});

test('notes come ordered by date descending', function () {
    $organization = Organization::factory()->create();
    $patient = Patient::factory()->create();
    $membership = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $appointment = Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'patient_id' => $patient->id,
    ]);

    $older = ClinicalNote::factory()->create([
        'appointment_id' => $appointment->id,
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'created_at' => now()->subMinutes(10),
    ]);
    $newer = ClinicalNote::factory()->create([
        'appointment_id' => $appointment->id,
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'created_at' => now(),
    ]);

    $response = $this->actingAs($membership->user)->getJson("/api/v1/patients/{$patient->id}/clinical-notes");

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(2);
    $response->assertJsonPath('data.0.id', $newer->id);
    $response->assertJsonPath('data.1.id', $older->id);
});

test('a guest gets 401', function () {
    $patient = Patient::factory()->create();

    $this->getJson("/api/v1/patients/{$patient->id}/clinical-notes")->assertStatus(401);
});
