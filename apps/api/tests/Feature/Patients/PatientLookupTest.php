<?php

declare(strict_types=1);

use App\Enums\DocumentType;
use App\Models\Membership;
use App\Models\Patient;
use App\Support\CurrentOrganization;
use Illuminate\Support\Facades\DB;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('lookup resolves a patient that exists globally but is not linked to the active organization', function () {
    $membership = Membership::factory()->create();
    $patient = Patient::factory()->create([
        'document_type' => DocumentType::Dni,
        'document_number' => '50505050',
    ]);

    $response = $this->actingAs($membership->user)
        ->getJson('/api/v1/patients/lookup?document_type=dni&document_number=50505050');

    $response->assertOk();
    expect($response->json('data.id'))->toBe($patient->id);
});

test('lookup does not link the resolved patient to the active organization', function () {
    $membership = Membership::factory()->create();
    $patient = Patient::factory()->create([
        'document_type' => DocumentType::Dni,
        'document_number' => '60606060',
    ]);

    $this->actingAs($membership->user)
        ->getJson('/api/v1/patients/lookup?document_type=dni&document_number=60606060')
        ->assertOk();

    expect(DB::table('organization_patient')->where('patient_id', $patient->id)->count())->toBe(0);
});

test('lookup returns 404 for an unknown pair', function () {
    $membership = Membership::factory()->create();

    $response = $this->actingAs($membership->user)
        ->getJson('/api/v1/patients/lookup?document_type=dni&document_number=00000001');

    $response->assertStatus(404);
});

test('lookup returns 422 when document_type or document_number is missing', function () {
    $membership = Membership::factory()->create();

    $this->actingAs($membership->user)
        ->getJson('/api/v1/patients/lookup?document_number=12345678')
        ->assertStatus(422);

    $this->actingAs($membership->user)
        ->getJson('/api/v1/patients/lookup?document_type=dni')
        ->assertStatus(422);
});
