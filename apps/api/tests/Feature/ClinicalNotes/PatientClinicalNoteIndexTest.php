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
    ClinicalNote::factory()->withBody('Nota escrita por otro profesional.')->create([
        'appointment_id' => $authorAppointment->id,
        'organization_id' => $organization->id,
        'membership_id' => $author->id,
    ]);

    $response = $this->actingAs($viewer->user)->getJson("/api/v1/patients/{$patient->id}/clinical-notes");

    $response->assertOk();
    expect($response->json('data.0.body'))->toBe('Nota escrita por otro profesional.');
});

test('the author of a note sees their own note even without any appointment with the patient, once they give a reason', function () {
    $organization = Organization::factory()->create();
    $patient = Patient::factory()->create();
    $otherProfessional = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $appointment = Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $otherProfessional->id,
        'patient_id' => $patient->id,
    ]);

    $author = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    ClinicalNote::factory()->withBody('Nota propia sin turno con el paciente.')->create([
        'appointment_id' => $appointment->id,
        'organization_id' => $organization->id,
        'membership_id' => $author->id,
    ]);

    $this->actingAs($author->user)->getJson("/api/v1/patients/{$patient->id}/clinical-notes")
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'clinical_access.reason_required');

    freshRequestState();
    $this->actingAs($author->user)->postJson("/api/v1/patients/{$patient->id}/exceptional-accesses", ['reason' => 'study_result'])
        ->assertCreated();

    freshRequestState();
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
        'start_at' => now()->subDay(),
        'end_at' => now()->subDay()->addMinutes(30),
    ]);
    ClinicalNote::factory()->withBody('Nota de la organización A.')->create([
        'appointment_id' => $appointmentA->id,
        'organization_id' => $organizationA->id,
        'membership_id' => $membershipA->id,
    ]);

    $membershipB = Membership::factory()->professional()->create(['organization_id' => $organizationB->id]);
    $appointmentB = Appointment::factory()->create([
        'organization_id' => $organizationB->id,
        'membership_id' => $membershipB->id,
        'patient_id' => $patient->id,
    ]);
    ClinicalNote::factory()->withBody('Nota de la organización B.')->create([
        'appointment_id' => $appointmentB->id,
        'organization_id' => $organizationB->id,
        'membership_id' => $membershipB->id,
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
        'start_at' => now()->addDays(2),
        'end_at' => now()->addDays(2)->addMinutes(30),
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

test('a note keeps its author name after the author membership is deactivated', function () {
    $organization = Organization::factory()->create();
    $patient = Patient::factory()->create();
    $viewer = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $viewer->id,
        'patient_id' => $patient->id,
        'start_at' => now()->addDays(6),
        'end_at' => now()->addDays(6)->addMinutes(30),
    ]);

    $author = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $author->user->update(['name' => 'Dra. Dada de Baja']);
    $authorAppointment = Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $author->id,
        'patient_id' => $patient->id,
    ]);
    ClinicalNote::factory()->create([
        'appointment_id' => $authorAppointment->id,
        'organization_id' => $organization->id,
        'membership_id' => $author->id,
    ]);
    $author->delete();

    $response = $this->actingAs($viewer->user)->getJson("/api/v1/patients/{$patient->id}/clinical-notes");

    $response->assertOk();
    expect($response->json('data.0.author_name'))->toBe('Dra. Dada de Baja');
});
