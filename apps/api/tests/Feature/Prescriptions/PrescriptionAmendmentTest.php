<?php

declare(strict_types=1);

use App\Enums\ErrorCode;
use App\Models\Appointment;
use App\Models\Membership;
use App\Models\Prescription;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

function amendablePrescription(array $attributes = []): Prescription
{
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);

    return Prescription::factory()->create(['appointment_id' => $appointment->id, ...$attributes]);
}

/**
 * The single item PrescriptionFactory gives every record.
 *
 * @return array<string, mixed>
 */
function factoryPrescriptionItem(): array
{
    return ['medication' => 'Amoxicilina', 'presentation' => 'Comprimidos 500 mg', 'dosage' => '1 cada 8 h por 7 días', 'quantity' => 1];
}

test('an amendment adds version 2 with the new items, keeping version 1 and issued_at', function () {
    $prescription = amendablePrescription(['issued_at' => now()->subDay()->startOfSecond()]);
    $issuedAt = $prescription->issued_at;

    $response = $this->actingAs($prescription->author->user)->postJson("/api/v1/prescriptions/{$prescription->id}/amendments", [
        'items' => [
            ['medication' => 'Paracetamol', 'presentation' => '500 mg', 'dosage' => '1 cada 6 h', 'quantity' => 3],
        ],
        'reason' => 'Alergia a la amoxicilina.',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.version', 2)
        ->assertJsonCount(1, 'data.items')
        ->assertJsonPath('data.items.0.medication', 'Paracetamol')
        ->assertJsonPath('data.versions.0.items.0.medication', 'Amoxicilina')
        ->assertJsonPath('data.versions.0.reason', null)
        ->assertJsonPath('data.versions.1.items.0.medication', 'Paracetamol')
        ->assertJsonPath('data.versions.1.reason', 'Alergia a la amoxicilina.');
    expect($response->json('data.amended_at'))->not->toBeNull();

    $fresh = Prescription::findOrFail($prescription->id);
    expect($fresh->issued_at->equalTo($issuedAt))->toBeTrue()
        ->and($fresh->versions()->count())->toBe(2)
        ->and($fresh->versions()->first()->items()->sole()->medication)->toBe('Amoxicilina');
});

test('an amendment returns 422 when the items list is emptied, and adds no version', function () {
    $prescription = amendablePrescription();

    $this->actingAs($prescription->author->user)->postJson("/api/v1/prescriptions/{$prescription->id}/amendments", ['items' => []])
        ->assertStatus(422)
        ->assertJsonValidationErrors('items');

    expect($prescription->versions()->count())->toBe(1);
});

test('an amendment returns 422 for a too long reason', function () {
    $prescription = amendablePrescription();

    $this->actingAs($prescription->author->user)->postJson("/api/v1/prescriptions/{$prescription->id}/amendments", [
        'items' => [['medication' => 'Paracetamol', 'dosage' => '1 cada 6 h', 'quantity' => 1]],
        'reason' => str_repeat('a', 501),
    ])->assertStatus(422)->assertJsonValidationErrors('reason');
});

test('an amendment that repeats the current items returns 409 and adds no version', function () {
    $prescription = amendablePrescription();

    $this->actingAs($prescription->author->user)->postJson("/api/v1/prescriptions/{$prescription->id}/amendments", [
        'items' => [factoryPrescriptionItem()],
    ])->assertStatus(409)->assertJsonPath('error.code', ErrorCode::PrescriptionsAmendmentUnchanged->value);

    expect($prescription->versions()->count())->toBe(1);
});

test('reordering the items is a change', function () {
    $prescription = amendablePrescription();
    $other = ['medication' => 'Ibuprofeno', 'presentation' => null, 'dosage' => '1 cada 12 h', 'quantity' => 1];
    $this->actingAs($prescription->author->user)->postJson("/api/v1/prescriptions/{$prescription->id}/amendments", [
        'items' => [factoryPrescriptionItem(), $other],
    ])->assertCreated();
    freshRequestState();

    $this->actingAs($prescription->author->user)->postJson("/api/v1/prescriptions/{$prescription->id}/amendments", [
        'items' => [$other, factoryPrescriptionItem()],
    ])->assertCreated()->assertJsonPath('data.version', 3);
});
