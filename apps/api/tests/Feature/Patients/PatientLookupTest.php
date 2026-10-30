<?php

declare(strict_types=1);

use App\Enums\DocumentType;
use App\Enums\ErrorCode;
use App\Models\Membership;
use App\Models\Patient;
use App\Models\PatientLookup;
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
        ->postJson('/api/v1/patients/lookup', ['document_type' => 'dni', 'document_number' => '50505050']);

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
        ->postJson('/api/v1/patients/lookup', ['document_type' => 'dni', 'document_number' => '60606060'])
        ->assertOk();

    expect(DB::table('organization_patient')->where('patient_id', $patient->id)->count())->toBe(0);
});

test('lookup returns 404 with the patients-not-found domain error for an unknown pair', function () {
    $membership = Membership::factory()->create();

    $response = $this->actingAs($membership->user)
        ->postJson('/api/v1/patients/lookup', ['document_type' => 'dni', 'document_number' => '00000001']);

    $response->assertStatus(404);
    $response->assertJsonPath('error.code', ErrorCode::PatientsNotFound->value);
});

test('lookup returns 422 when document_type or document_number is missing', function () {
    $membership = Membership::factory()->create();

    $this->actingAs($membership->user)
        ->postJson('/api/v1/patients/lookup', ['document_number' => '12345678'])
        ->assertStatus(422);

    $this->actingAs($membership->user)
        ->postJson('/api/v1/patients/lookup', ['document_type' => 'dni'])
        ->assertStatus(422);
});

test('lookup answers the personal data the platform shares, contacts included', function () {
    $membership = Membership::factory()->create();
    Patient::factory()->withEmail('compartido@example.com')->create([
        'document_type' => DocumentType::Dni,
        'document_number' => '50505051',
    ]);

    $this->actingAs($membership->user)
        ->postJson('/api/v1/patients/lookup', ['document_type' => 'dni', 'document_number' => '50505051'])
        ->assertOk()
        ->assertJsonPath('data.contacts.0.value', 'compartido@example.com');
});

test('every lookup leaves a patient_lookups row, and a miss keeps nothing of the document searched', function () {
    $membership = Membership::factory()->create();
    $patient = Patient::factory()->create([
        'document_type' => DocumentType::Dni,
        'document_number' => '50505052',
    ]);

    $this->actingAs($membership->user)
        ->postJson('/api/v1/patients/lookup', ['document_type' => 'dni', 'document_number' => '50505052'])
        ->assertOk();
    $this->actingAs($membership->user)
        ->postJson('/api/v1/patients/lookup', ['document_type' => 'dni', 'document_number' => '00000099'])
        ->assertNotFound();

    expect(PatientLookup::query()->orderBy('id')->get(['organization_id', 'membership_id', 'patient_id'])->toArray())->toBe([
        ['organization_id' => $membership->organization_id, 'membership_id' => $membership->id, 'patient_id' => $patient->id],
        ['organization_id' => $membership->organization_id, 'membership_id' => $membership->id, 'patient_id' => null],
    ]);
    expect(json_encode(DB::table('patient_lookups')->get()))->not->toContain('00000099');
});

test('a membership can look up 30 documents every 5 minutes, then gets a 429', function () {
    $membership = Membership::factory()->create();
    foreach (range(1, 30) as $n) {
        $this->actingAs($membership->user)
            ->postJson('/api/v1/patients/lookup', ['document_type' => 'dni', 'document_number' => (string) (70000000 + $n)])
            ->assertNotFound();
    }

    $this->actingAs($membership->user)
        ->postJson('/api/v1/patients/lookup', ['document_type' => 'dni', 'document_number' => '70000099'])
        ->assertStatus(429);
    expect(PatientLookup::query()->count())->toBe(30);

    $this->travel(5)->minutes();

    $this->actingAs($membership->user)
        ->postJson('/api/v1/patients/lookup', ['document_type' => 'dni', 'document_number' => '70000099'])
        ->assertNotFound();
});
