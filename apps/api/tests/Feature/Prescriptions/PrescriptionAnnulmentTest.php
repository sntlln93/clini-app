<?php

declare(strict_types=1);

use App\Enums\ErrorCode;
use App\Enums\PrescriptionAnnulmentKind;
use App\Models\Appointment;
use App\Models\Membership;
use App\Models\Prescription;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

function annullablePrescription(): Prescription
{
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);

    return Prescription::factory()->create(['appointment_id' => $appointment->id]);
}

test('annulling keeps the record and every version, marked as annulled with its kind and reason', function (PrescriptionAnnulmentKind $kind) {
    $prescription = annullablePrescription();

    $response = $this->actingAs($prescription->author->user)->postJson("/api/v1/prescriptions/{$prescription->id}/annulment", [
        'kind' => $kind->value,
        'reason' => 'Indicada en el turno de otro paciente.',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.items.0.medication', 'Amoxicilina')
        ->assertJsonCount(1, 'data.versions')
        ->assertJsonPath('data.annulment.kind', $kind->value)
        ->assertJsonPath('data.annulment.reason', 'Indicada en el turno de otro paciente.');
    expect($response->json('data.annulment.created_at'))->not->toBeNull();

    $annulment = Prescription::findOrFail($prescription->id)->annulment()->sole();
    expect($annulment->membership_id)->toBe($prescription->membership_id)
        ->and($annulment->kind)->toBe($kind);

    freshRequestState();
    $this->actingAs($prescription->author->user)->getJson("/api/v1/appointments/{$prescription->appointment_id}/prescriptions")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.annulment.kind', $kind->value);
    freshRequestState();
    openClinicalHistory($prescription->author, $prescription->patient_id);
    $this->actingAs($prescription->author->user)->getJson("/api/v1/patients/{$prescription->patient_id}/prescriptions")
        ->assertOk()
        ->assertJsonPath('data.0.annulment.reason', 'Indicada en el turno de otro paciente.');
})->with(PrescriptionAnnulmentKind::cases());

test('a record that was never annulled says so', function () {
    $prescription = annullablePrescription();

    $this->actingAs($prescription->author->user)->getJson("/api/v1/appointments/{$prescription->appointment_id}/prescriptions")
        ->assertOk()
        ->assertJsonPath('data.0.annulment', null);
});

test('annulling requires a kind and a reason of 3 to 500 characters', function (array $payload, string $field) {
    $prescription = annullablePrescription();

    $this->actingAs($prescription->author->user)->postJson("/api/v1/prescriptions/{$prescription->id}/annulment", $payload)
        ->assertStatus(422)
        ->assertJsonValidationErrors($field);

    expect($prescription->annulment()->exists())->toBeFalse();
})->with([
    'missing reason' => [['kind' => 'never_needed'], 'reason'],
    'too short reason' => [['kind' => 'never_needed', 'reason' => 'no'], 'reason'],
    'blank reason' => [['kind' => 'never_needed', 'reason' => '      '], 'reason'],
    'too long reason' => [['kind' => 'never_needed', 'reason' => str_repeat('a', 501)], 'reason'],
    'missing kind' => [['reason' => 'Terminó el tratamiento.'], 'kind'],
    'unknown kind' => [['kind' => 'suspended', 'reason' => 'Terminó el tratamiento.'], 'kind'],
]);

test('annulling an annulled record returns 409 and keeps the first annulment', function () {
    $prescription = annullablePrescription();
    $prescription->annulment()->create([
        'membership_id' => $prescription->membership_id,
        'kind' => PrescriptionAnnulmentKind::NoLongerNeeded,
        'reason' => 'Primera anulación.',
    ]);

    $this->actingAs($prescription->author->user)->postJson("/api/v1/prescriptions/{$prescription->id}/annulment", [
        'kind' => 'never_needed',
        'reason' => 'Segunda anulación.',
    ])->assertStatus(409)->assertJsonPath('error.code', ErrorCode::PrescriptionsAnnulled->value);

    $annulment = $prescription->annulment()->sole();
    expect($annulment->reason)->toBe('Primera anulación.')
        ->and($annulment->kind)->toBe(PrescriptionAnnulmentKind::NoLongerNeeded);
});

test('an annulled record can no longer be amended: 409 and no new version', function () {
    $prescription = annullablePrescription();
    $prescription->annulment()->create([
        'membership_id' => $prescription->membership_id,
        'kind' => PrescriptionAnnulmentKind::NeverNeeded,
        'reason' => 'Paciente equivocado.',
    ]);

    $this->actingAs($prescription->author->user)->postJson("/api/v1/prescriptions/{$prescription->id}/amendments", [
        'items' => [['medication' => 'Paracetamol', 'dosage' => '1 cada 6 h', 'quantity' => 1]],
    ])->assertStatus(409)->assertJsonPath('error.code', ErrorCode::PrescriptionsAnnulled->value);

    expect($prescription->versions()->count())->toBe(1);
});

test('an amended record can be annulled, and keeps both versions', function () {
    $prescription = annullablePrescription();
    $this->actingAs($prescription->author->user)->postJson("/api/v1/prescriptions/{$prescription->id}/amendments", [
        'items' => [['medication' => 'Paracetamol', 'dosage' => '1 cada 6 h', 'quantity' => 1]],
    ])->assertCreated();
    freshRequestState();

    $this->actingAs($prescription->author->user)->postJson("/api/v1/prescriptions/{$prescription->id}/annulment", [
        'kind' => 'no_longer_needed',
        'reason' => 'Terminó el tratamiento.',
    ])->assertCreated()
        ->assertJsonPath('data.version', 2)
        ->assertJsonCount(2, 'data.versions')
        ->assertJsonPath('data.annulment.kind', 'no_longer_needed');
});
