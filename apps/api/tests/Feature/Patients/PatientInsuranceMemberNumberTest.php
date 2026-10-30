<?php

declare(strict_types=1);

use App\Actions\Patients\RegisterPatientAction;
use App\Data\Patients\PatientRegistrationData;
use App\Enums\DocumentType;
use App\Exceptions\Patients\InsuranceMemberNumberTakenException;
use App\Models\InsuranceProvider;
use App\Models\Membership;
use App\Models\Patient;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

function memberNumberPayload(array $overrides = []): array
{
    return [
        'name' => 'Juana Diaz',
        'document_type' => 'dni',
        'document_number' => '27123456',
        ...$overrides,
    ];
}

test('store keeps the member number next to the insurance provider and returns it', function () {
    $membership = Membership::factory()->create();
    $provider = InsuranceProvider::factory()->create();

    $response = $this->actingAs($membership->user)->postJson('/api/v1/patients', memberNumberPayload([
        'insurance_provider_id' => $provider->id,
        'insurance_member_number' => '37415820',
    ]));

    $response->assertCreated()->assertJsonPath('data.insurance_member_number', '37415820');
    $patient = Patient::findOrFail($response->json('data.id'));
    expect($patient->insurance_provider_id)->toBe($provider->id);
    expect($patient->insurance_member_number)->toBe('37415820');
});

test('store requires a member number when an insurance provider is chosen', function () {
    $membership = Membership::factory()->create();
    $provider = InsuranceProvider::factory()->create();

    $this->actingAs($membership->user)->postJson('/api/v1/patients', memberNumberPayload([
        'insurance_provider_id' => $provider->id,
    ]))->assertStatus(422)->assertJsonValidationErrors('insurance_member_number');
});

test('store drops a member number sent without an insurance provider', function () {
    $membership = Membership::factory()->create();

    $response = $this->actingAs($membership->user)->postJson('/api/v1/patients', memberNumberPayload([
        'insurance_provider_id' => null,
        'insurance_member_number' => '37415820',
    ]));

    $response->assertCreated()->assertJsonPath('data.insurance_member_number', null);
});

test('an insurance card is no longer accepted as the identity document', function () {
    $membership = Membership::factory()->create();

    $this->actingAs($membership->user)->postJson('/api/v1/patients', memberNumberPayload([
        'document_type' => 'insurance_id',
    ]))->assertStatus(422)->assertJsonValidationErrors('document_type');
});

test('reusing an existing patient without insurance fills the provider and member number together', function () {
    $membership = Membership::factory()->create();
    $provider = InsuranceProvider::factory()->create();
    $existing = Patient::factory()->create(['document_type' => DocumentType::Dni, 'document_number' => '27123456']);

    $this->actingAs($membership->user)->postJson('/api/v1/patients', memberNumberPayload([
        'insurance_provider_id' => $provider->id,
        'insurance_member_number' => '37415820',
    ]))->assertCreated();

    $existing->refresh();
    expect($existing->insurance_provider_id)->toBe($provider->id);
    expect($existing->insurance_member_number)->toBe('37415820');
});

test('reusing an existing insured patient never moves their member number to another provider', function () {
    $membership = Membership::factory()->create();
    $current = InsuranceProvider::factory()->create();
    $other = InsuranceProvider::factory()->create();
    $existing = Patient::factory()->create([
        'document_type' => DocumentType::Dni,
        'document_number' => '27123456',
        'insurance_provider_id' => $current->id,
        'insurance_member_number' => '11111111',
    ]);

    $this->actingAs($membership->user)->postJson('/api/v1/patients', memberNumberPayload([
        'insurance_provider_id' => $other->id,
        'insurance_member_number' => '22222222',
    ]))->assertCreated();

    $existing->refresh();
    expect($existing->insurance_provider_id)->toBe($current->id);
    expect($existing->insurance_member_number)->toBe('11111111');
});

test('update requires a member number with the provider and clears it when the provider is removed', function () {
    $membership = Membership::factory()->create();
    $provider = InsuranceProvider::factory()->create();
    $patient = Patient::factory()->create(['document_type' => DocumentType::Dni, 'document_number' => '27123456']);
    $patient->organizations()->attach($membership->organization_id);

    $this->actingAs($membership->user)->putJson("/api/v1/patients/{$patient->id}", memberNumberPayload([
        'insurance_provider_id' => $provider->id,
        'insurance_member_number' => '',
    ]))->assertStatus(422)->assertJsonValidationErrors('insurance_member_number');

    $this->putJson("/api/v1/patients/{$patient->id}", memberNumberPayload([
        'insurance_provider_id' => $provider->id,
        'insurance_member_number' => '37415820',
    ]))->assertOk()->assertJsonPath('data.insurance_member_number', '37415820');

    $this->putJson("/api/v1/patients/{$patient->id}", memberNumberPayload([
        'insurance_provider_id' => null,
        'insurance_member_number' => '37415820',
    ]))->assertOk()->assertJsonPath('data.insurance_member_number', null);

    expect($patient->refresh()->insurance_member_number)->toBeNull();
});

test('store rejects a member number another patient has in the same provider, whatever its separators or case', function (string $typed) {
    $membership = Membership::factory()->create();
    $provider = InsuranceProvider::factory()->create();
    Patient::factory()->create([
        'insurance_provider_id' => $provider->id,
        'insurance_member_number' => '37-415820/0a',
    ]);

    $this->actingAs($membership->user)->postJson('/api/v1/patients', memberNumberPayload([
        'insurance_provider_id' => $provider->id,
        'insurance_member_number' => $typed,
    ]))->assertStatus(422)->assertJsonValidationErrors([
        'insurance_member_number' => 'Ese número de afiliado ya está registrado para otro paciente de la misma obra social.',
    ]);

    expect(Patient::query()->where('document_number', '27123456')->exists())->toBeFalse();
})->with(['37-415820/0a', '374158200A', '37 415820 0a']);

test('store accepts a member number another patient has in a different provider', function () {
    $membership = Membership::factory()->create();
    Patient::factory()->create([
        'insurance_provider_id' => InsuranceProvider::factory()->create()->id,
        'insurance_member_number' => '37415820',
    ]);
    $otherProvider = InsuranceProvider::factory()->create();

    $this->actingAs($membership->user)->postJson('/api/v1/patients', memberNumberPayload([
        'insurance_provider_id' => $otherProvider->id,
        'insurance_member_number' => '37415820',
    ]))->assertCreated()->assertJsonPath('data.insurance_member_number', '37415820');
});

test('store accepts the member number of the patient its document resolves to', function () {
    $membership = Membership::factory()->create();
    $provider = InsuranceProvider::factory()->create();
    $existing = Patient::factory()->create([
        'document_type' => DocumentType::Dni,
        'document_number' => '27123456',
        'insurance_provider_id' => $provider->id,
        'insurance_member_number' => '37415820',
    ]);

    $this->actingAs($membership->user)->postJson('/api/v1/patients', memberNumberPayload([
        'insurance_provider_id' => $provider->id,
        'insurance_member_number' => '37415820',
    ]))->assertCreated()->assertJsonPath('data.id', $existing->id);
});

test('store rejects a member number made only of separators', function () {
    $membership = Membership::factory()->create();

    $this->actingAs($membership->user)->postJson('/api/v1/patients', memberNumberPayload([
        'insurance_provider_id' => InsuranceProvider::factory()->create()->id,
        'insurance_member_number' => '-/ ',
    ]))->assertStatus(422)->assertJsonValidationErrors([
        'insurance_member_number' => 'El número de afiliado debe tener al menos una letra o un número.',
    ]);
});

test('update rejects a member number another patient has in the same provider but keeps the patient own one', function () {
    $membership = Membership::factory()->create();
    $provider = InsuranceProvider::factory()->create();
    Patient::factory()->create([
        'insurance_provider_id' => $provider->id,
        'insurance_member_number' => '37415820',
    ]);
    $patient = Patient::factory()->create([
        'insurance_provider_id' => $provider->id,
        'insurance_member_number' => '11111111',
    ]);
    $patient->organizations()->attach($membership->organization_id);
    $payload = [
        'name' => $patient->name,
        'document_type' => $patient->document_type->value,
        'document_number' => $patient->document_number,
        'insurance_provider_id' => $provider->id,
    ];

    $this->actingAs($membership->user)
        ->putJson("/api/v1/patients/{$patient->id}", [...$payload, 'insurance_member_number' => '37-415820'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('insurance_member_number');

    $this->actingAs($membership->user)
        ->putJson("/api/v1/patients/{$patient->id}", [...$payload, 'insurance_member_number' => '1111-1111'])
        ->assertOk();
});

test('a concurrent claim of a taken member number reaching the index is a 409 domain error, not a reuse', function () {
    $provider = InsuranceProvider::factory()->create();
    $organizationId = Membership::factory()->create()->organization_id;
    Patient::factory()->create([
        'insurance_provider_id' => $provider->id,
        'insurance_member_number' => '37415820',
    ]);

    // Calls the action directly, as a request that passed validation before the other patient committed would.
    expect(fn () => app(RegisterPatientAction::class)->handle(new PatientRegistrationData(
        organizationId: $organizationId,
        createdBy: null,
        name: 'Juana Diaz',
        documentType: DocumentType::Dni,
        documentNumber: '27123456',
        contacts: [],
        sex: null,
        birthDate: null,
        insuranceProviderId: $provider->id,
        insuranceMemberNumber: '37-415820',
    )))->toThrow(InsuranceMemberNumberTakenException::class);

    expect(Patient::query()->where('document_number', '27123456')->exists())->toBeFalse();
});
