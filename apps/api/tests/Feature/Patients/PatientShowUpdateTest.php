<?php

declare(strict_types=1);

use App\Enums\DocumentType;
use App\Models\Membership;
use App\Models\Patient;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('show returns a patient linked to the active organization', function () {
    $membership = Membership::factory()->create();
    $patient = Patient::factory()->create();
    $patient->organizations()->attach($membership->organization_id);

    $response = $this->actingAs($membership->user)->getJson("/api/v1/patients/{$patient->id}");

    $response->assertOk();
    expect($response->json('data.id'))->toBe($patient->id);
});

test('show on a patient not linked to the active organization is denied', function () {
    $membership = Membership::factory()->create();
    $patient = Patient::factory()->create();

    $response = $this->actingAs($membership->user)->getJson("/api/v1/patients/{$patient->id}");

    $response->assertStatus(403);
});

test('update changes contact fields of a linked patient and the response reflects them', function () {
    $membership = Membership::factory()->create();
    $patient = Patient::factory()->create([
        'name' => 'Nombre Constante',
        'document_type' => DocumentType::Dni,
        'document_number' => '10101010',
        'phone' => '000000000',
    ]);
    $patient->organizations()->attach($membership->organization_id);

    $response = $this->actingAs($membership->user)->putJson("/api/v1/patients/{$patient->id}", [
        'name' => 'Nombre Constante',
        'document_type' => 'dni',
        'document_number' => '10101010',
        'phone' => '999999999',
        'email' => 'actualizado@example.com',
    ]);

    $response->assertOk();
    expect($response->json('data.phone'))->toBe('999999999');
    expect($response->json('data.email'))->toBe('actualizado@example.com');
});

test('update can move the patient to a free document pair', function () {
    $membership = Membership::factory()->create();
    $patient = Patient::factory()->create([
        'document_type' => DocumentType::Dni,
        'document_number' => '20202020',
    ]);
    $patient->organizations()->attach($membership->organization_id);

    $response = $this->actingAs($membership->user)->putJson("/api/v1/patients/{$patient->id}", [
        'name' => $patient->name,
        'document_type' => 'passport',
        'document_number' => 'X1234567',
    ]);

    $response->assertOk();
    expect($response->json('data.document_type'))->toBe('passport');
    expect($response->json('data.document_number'))->toBe('X1234567');
});

test('update to a pair already owned by another patient returns 422 and changes nothing', function () {
    $membership = Membership::factory()->create();
    Patient::factory()->create([
        'document_type' => DocumentType::Dni,
        'document_number' => '30303030',
    ]);
    $patient = Patient::factory()->create([
        'document_type' => DocumentType::Dni,
        'document_number' => '40404040',
    ]);
    $patient->organizations()->attach($membership->organization_id);

    $response = $this->actingAs($membership->user)->putJson("/api/v1/patients/{$patient->id}", [
        'name' => $patient->name,
        'document_type' => 'dni',
        'document_number' => '30303030',
    ]);

    $response->assertStatus(422);
    expect($patient->fresh()->document_number)->toBe('40404040');
});

test('update on a patient not linked to the active organization is denied', function () {
    $membership = Membership::factory()->create();
    $patient = Patient::factory()->create();

    $response = $this->actingAs($membership->user)->putJson("/api/v1/patients/{$patient->id}", [
        'name' => 'Nuevo Nombre',
        'document_type' => $patient->document_type->value,
        'document_number' => $patient->document_number,
    ]);

    $response->assertStatus(403);
});
