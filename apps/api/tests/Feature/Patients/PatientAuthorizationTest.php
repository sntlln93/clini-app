<?php

declare(strict_types=1);

use App\Models\Membership;
use App\Models\Patient;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('a professional membership can index, store and update patients', function () {
    $membership = Membership::factory()->professional()->create();

    $this->actingAs($membership->user)->getJson('/api/v1/patients')->assertOk();

    $storeResponse = $this->actingAs($membership->user)->postJson('/api/v1/patients', [
        'name' => 'Paciente Profesional',
        'document_type' => 'dni',
        'document_number' => '70707070',
    ]);
    $storeResponse->assertCreated();

    $this->actingAs($membership->user)->putJson("/api/v1/patients/{$storeResponse->json('data.id')}", [
        'name' => 'Paciente Profesional',
        'document_type' => 'dni',
        'document_number' => '70707070',
        'phone' => '111000111',
    ])->assertOk();
});

test('a staff membership can index, store and update patients', function () {
    $membership = Membership::factory()->staff()->create();

    $this->actingAs($membership->user)->getJson('/api/v1/patients')->assertOk();

    $storeResponse = $this->actingAs($membership->user)->postJson('/api/v1/patients', [
        'name' => 'Paciente Staff',
        'document_type' => 'dni',
        'document_number' => '80808080',
    ]);
    $storeResponse->assertCreated();

    $this->actingAs($membership->user)->putJson("/api/v1/patients/{$storeResponse->json('data.id')}", [
        'name' => 'Paciente Staff',
        'document_type' => 'dni',
        'document_number' => '80808080',
        'phone' => '222000222',
    ])->assertOk();
});

test('DELETE on a patient is not routable', function () {
    $membership = Membership::factory()->create();
    $patient = Patient::factory()->create();
    $patient->organizations()->attach($membership->organization_id);

    $response = $this->actingAs($membership->user)->deleteJson("/api/v1/patients/{$patient->id}");

    $response->assertStatus(405);
});

test('a guest gets 401 on index, store, show, update and lookup', function () {
    $patient = Patient::factory()->create();

    $this->getJson('/api/v1/patients')->assertStatus(401);
    $this->postJson('/api/v1/patients', [])->assertStatus(401);
    $this->getJson("/api/v1/patients/{$patient->id}")->assertStatus(401);
    $this->putJson("/api/v1/patients/{$patient->id}", [])->assertStatus(401);
    $this->getJson('/api/v1/patients/lookup?document_type=dni&document_number=1')->assertStatus(401);
});
