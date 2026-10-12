<?php

declare(strict_types=1);

use App\Enums\DocumentType;
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
