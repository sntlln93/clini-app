<?php

declare(strict_types=1);

use App\Models\Appointment;
use App\Models\ClinicalNote;
use App\Models\Membership;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('store on one\'s own appointment returns 201 and persists organization, membership, appointment and its patient', function () {
    $membership = Membership::factory()->create();
    $appointment = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);

    $response = $this->actingAs($membership->user)->postJson("/api/v1/appointments/{$appointment->id}/clinical-notes", [
        'body' => 'Paciente refiere dolor lumbar.',
    ]);

    $response->assertCreated();
    $note = ClinicalNote::findOrFail($response->json('data.id'));

    expect($note->membership_id)->toBe($membership->id);
    expect($note->organization_id)->toBe($membership->organization_id);
    expect($note->appointment_id)->toBe($appointment->id);
    expect($note->patient_id)->toBe($appointment->patient_id);
});

test('store ignores membership_id, organization_id, appointment_id and patient_id sent in the payload', function () {
    $membership = Membership::factory()->create();
    $appointment = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);
    $otherMembership = Membership::factory()->create();
    $otherAppointment = Appointment::factory()->create();

    $response = $this->actingAs($membership->user)->postJson("/api/v1/appointments/{$appointment->id}/clinical-notes", [
        'body' => 'Nota con payload manipulado.',
        'membership_id' => $otherMembership->id,
        'organization_id' => $otherMembership->organization_id,
        'appointment_id' => $otherAppointment->id,
        'patient_id' => $otherAppointment->patient_id,
    ]);

    $response->assertCreated();
    $note = ClinicalNote::findOrFail($response->json('data.id'));

    expect($note->membership_id)->toBe($membership->id);
    expect($note->organization_id)->toBe($membership->organization_id);
    expect($note->appointment_id)->toBe($appointment->id);
    expect($note->patient_id)->toBe($appointment->patient_id);
});

test('store returns 422 when body is missing, and 422 when body exceeds the max length', function () {
    $membership = Membership::factory()->create();
    $appointment = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);

    $this->actingAs($membership->user)->postJson("/api/v1/appointments/{$appointment->id}/clinical-notes", [])
        ->assertStatus(422)
        ->assertJsonValidationErrors('body');

    $this->actingAs($membership->user)->postJson("/api/v1/appointments/{$appointment->id}/clinical-notes", [
        'body' => str_repeat('a', 5001),
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('body');
});

test('index returns only the acting membership\'s notes for that appointment, newest first', function () {
    $membership = Membership::factory()->create();
    $appointment = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);

    $older = ClinicalNote::factory()->create([
        'appointment_id' => $appointment->id,
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'created_at' => now()->subMinutes(10),
    ]);
    $newer = ClinicalNote::factory()->create([
        'appointment_id' => $appointment->id,
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'created_at' => now(),
    ]);

    $otherMembership = Membership::factory()->create(['organization_id' => $membership->organization_id]);
    ClinicalNote::factory()->create([
        'appointment_id' => $appointment->id,
        'organization_id' => $membership->organization_id,
        'membership_id' => $otherMembership->id,
    ]);

    $response = $this->actingAs($membership->user)->getJson("/api/v1/appointments/{$appointment->id}/clinical-notes");

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(2);
    $response->assertJsonPath('data.0.id', $newer->id);
    $response->assertJsonPath('data.1.id', $older->id);
});

test('index does not include notes of a different appointment of the same professional', function () {
    $membership = Membership::factory()->create();
    $appointment = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);
    $otherAppointment = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);

    $note = ClinicalNote::factory()->create([
        'appointment_id' => $appointment->id,
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);
    ClinicalNote::factory()->create([
        'appointment_id' => $otherAppointment->id,
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);

    $response = $this->actingAs($membership->user)->getJson("/api/v1/appointments/{$appointment->id}/clinical-notes");

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(1);
    $response->assertJsonPath('data.0.id', $note->id);
});

test('the resource payload exposes exactly the fields ClinicalNoteResource declares', function () {
    $membership = Membership::factory()->create();
    $appointment = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);

    $response = $this->actingAs($membership->user)->postJson("/api/v1/appointments/{$appointment->id}/clinical-notes", [
        'body' => 'Nota de control.',
    ]);

    $response->assertCreated();
    expect(array_keys($response->json('data')))->toEqualCanonicalizing([
        'id', 'appointment_id', 'membership_id', 'body', 'diagnoses', 'version', 'created_at', 'amended_at', 'annulment', 'versions',
    ]);
    $response->assertJsonPath('data.version', 1)
        ->assertJsonPath('data.amended_at', null)
        ->assertJsonPath('data.annulment', null)
        ->assertJsonCount(1, 'data.versions')
        ->assertJsonPath('data.versions.0.body', 'Nota de control.')
        ->assertJsonPath('data.versions.0.reason', null);
    expect(array_keys($response->json('data.versions.0')))->toEqualCanonicalizing(['version', 'body', 'diagnoses', 'reason', 'created_at']);
});

test('store keeps the text as version 1, written by the author', function () {
    $membership = Membership::factory()->create();
    $appointment = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);

    $response = $this->actingAs($membership->user)->postJson("/api/v1/appointments/{$appointment->id}/clinical-notes", [
        'body' => 'Primera versión.',
    ]);

    $version = ClinicalNote::findOrFail($response->json('data.id'))->versions()->sole();

    expect($version->version)->toBe(1);
    expect($version->body)->toBe('Primera versión.');
    expect($version->membership_id)->toBe($membership->id);
    expect($version->reason)->toBeNull();
});
