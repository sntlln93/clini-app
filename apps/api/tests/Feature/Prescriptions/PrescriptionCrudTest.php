<?php

declare(strict_types=1);

use App\Models\Appointment;
use App\Models\InsuranceProvider;
use App\Models\Membership;
use App\Models\Patient;
use App\Models\Prescription;
use App\Support\CurrentOrganization;
use Illuminate\Support\Facades\Schema;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

function prescriptionOwnAppointment(Membership $membership, array $attributes = []): Appointment
{
    return Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        ...$attributes,
    ]);
}

function prescriptionPayload(array $overrides = []): array
{
    return [
        'items' => [
            [
                'medication' => 'Amoxicilina',
                'presentation' => 'Comprimidos 500 mg',
                'dosage' => '1 cada 8 h por 7 días',
                'quantity' => 2,
            ],
            [
                'medication' => 'Ibuprofeno',
                'presentation' => null,
                'dosage' => '1 cada 12 h si hay dolor',
                'quantity' => 1,
            ],
        ],
        ...$overrides,
    ];
}

test('store on one\'s own appointment returns 201 and persists the prescription with ordered items', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = prescriptionOwnAppointment($membership);

    $response = $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", prescriptionPayload());

    $response->assertCreated()
        ->assertJsonPath('data.items.0.medication', 'Amoxicilina')
        ->assertJsonPath('data.items.0.quantity', 2)
        ->assertJsonPath('data.items.1.medication', 'Ibuprofeno')
        ->assertJsonPath('data.items.1.presentation', null);

    $prescription = Prescription::findOrFail($response->json('data.id'));

    expect($prescription->membership_id)->toBe($membership->id)
        ->and($prescription->organization_id)->toBe($membership->organization_id)
        ->and($prescription->appointment_id)->toBe($appointment->id)
        ->and($prescription->patient_id)->toBe($appointment->patient_id)
        ->and($prescription->issued_at)->not->toBeNull()
        ->and($prescription->items()->pluck('position')->all())->toBe([0, 1]);
});

test('store ignores ownership fields sent in the payload', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = prescriptionOwnAppointment($membership);
    $other = Membership::factory()->onPaidPlan()->create();
    $otherPatient = Patient::factory()->create();

    $response = $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", prescriptionPayload([
            'membership_id' => $other->id,
            'organization_id' => $other->organization_id,
            'patient_id' => $otherPatient->id,
        ]));

    $response->assertCreated();
    $prescription = Prescription::findOrFail($response->json('data.id'));

    expect($prescription->membership_id)->toBe($membership->id)
        ->and($prescription->organization_id)->toBe($membership->organization_id)
        ->and($prescription->patient_id)->toBe($appointment->patient_id);
});

// The diagnosis lives in the clinical note, not next to the indicated
// medication (#319): one sent anyway is dropped, and there is no column for it.
test('store ignores a diagnosis sent in the payload', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = prescriptionOwnAppointment($membership);

    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", prescriptionPayload(['diagnosis' => 'Faringitis aguda']))
        ->assertCreated()
        ->assertJsonMissingPath('data.diagnosis');

    expect(Schema::hasColumn('prescriptions', 'diagnosis'))->toBeFalse();
});

test('store returns 422 when items are missing or empty', function (mixed $items) {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = prescriptionOwnAppointment($membership);

    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", ['items' => $items])
        ->assertStatus(422)
        ->assertJsonValidationErrors('items');

    expect(Prescription::count())->toBe(0);
})->with([
    'missing' => [null],
    'empty' => [[]],
]);

test('store returns 422 for an invalid item', function (array $item, string $field) {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = prescriptionOwnAppointment($membership);

    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", [
            'items' => [[
                'medication' => 'Amoxicilina',
                'dosage' => '1 cada 8 h',
                'quantity' => 1,
                ...$item,
            ]],
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors("items.0.{$field}");

    expect(Prescription::count())->toBe(0);
})->with([
    'zero quantity' => [['quantity' => 0], 'quantity'],
    'negative quantity' => [['quantity' => -3], 'quantity'],
    'non-integer quantity' => [['quantity' => 1.5], 'quantity'],
    'missing medication' => [['medication' => ''], 'medication'],
    'missing dosage' => [['dosage' => ''], 'dosage'],
]);

test('index returns only the acting membership\'s prescriptions for that appointment', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = prescriptionOwnAppointment($membership);
    $otherAppointment = prescriptionOwnAppointment($membership);
    $prescription = Prescription::factory()->create(['appointment_id' => $appointment->id]);
    Prescription::factory()->create(['appointment_id' => $otherAppointment->id]);

    $response = $this->actingAs($membership->user)->getJson("/api/v1/appointments/{$appointment->id}/prescriptions");

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(1);
    $response->assertJsonPath('data.0.id', $prescription->id);
});

// Nothing prints the record anymore (#319), so it carries no patient
// identity, insurance or author details, and there is no single-record read.
test('the listings carry only the medication, without patient or author details', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $provider = InsuranceProvider::factory()->create();
    $patient = Patient::factory()->create([
        'insurance_provider_id' => $provider->id,
        'insurance_member_number' => '37415820',
    ]);
    $appointment = prescriptionOwnAppointment($membership, ['patient_id' => $patient->id]);
    Prescription::factory()->create(['appointment_id' => $appointment->id]);

    $response = $this->actingAs($membership->user)->getJson("/api/v1/patients/{$patient->id}/prescriptions");

    $response->assertOk()->assertJsonPath('data.0.items.0.medication', 'Amoxicilina');
    foreach (['patient_name', 'patient_document_type', 'patient_document_number', 'patient_insurance_provider_name', 'patient_insurance_member_number', 'author_name', 'author_specialties'] as $field) {
        $response->assertJsonMissingPath("data.0.{$field}");
    }
});

test('a single record has no read endpoint', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $prescription = Prescription::factory()->create(['appointment_id' => prescriptionOwnAppointment($membership)->id]);

    $this->actingAs($membership->user)->getJson("/api/v1/prescriptions/{$prescription->id}")
        ->assertStatus(405);
});

test('update replaces the items, keeping issued_at', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = prescriptionOwnAppointment($membership);
    $prescription = Prescription::factory()->create([
        'appointment_id' => $appointment->id,
        'issued_at' => now()->subDay()->startOfSecond(),
    ]);
    $issuedAt = $prescription->issued_at;

    $response = $this->actingAs($membership->user)->patchJson("/api/v1/prescriptions/{$prescription->id}", [
        'items' => [
            ['medication' => 'Paracetamol', 'presentation' => '500 mg', 'dosage' => '1 cada 6 h', 'quantity' => 3],
        ],
    ]);

    $response->assertOk()
        ->assertJsonPath('data.items.0.medication', 'Paracetamol');
    expect($response->json('data.items'))->toHaveCount(1);

    $fresh = $prescription->fresh();
    expect($fresh->items)->toHaveCount(1)
        ->and($fresh->items->first()->quantity)->toBe(3)
        ->and($fresh->issued_at->equalTo($issuedAt))->toBeTrue();
});

test('update returns 422 when the items list is emptied', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = prescriptionOwnAppointment($membership);
    $prescription = Prescription::factory()->create(['appointment_id' => $appointment->id]);

    $this->actingAs($membership->user)->patchJson("/api/v1/prescriptions/{$prescription->id}", ['items' => []])
        ->assertStatus(422)
        ->assertJsonValidationErrors('items');

    expect($prescription->items()->count())->toBe(1);
});

test('the patient listing returns only the acting membership\'s prescriptions for that patient', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $colleague = Membership::factory()->professional()->create(['organization_id' => $membership->organization_id]);
    $patient = Patient::factory()->create();
    $otherPatient = Patient::factory()->create();

    $own = Prescription::factory()->create([
        'appointment_id' => prescriptionOwnAppointment($membership, ['patient_id' => $patient->id])->id,
    ]);
    Prescription::factory()->create([
        'appointment_id' => prescriptionOwnAppointment($colleague, ['patient_id' => $patient->id])->id,
    ]);
    Prescription::factory()->create([
        'appointment_id' => prescriptionOwnAppointment($membership, ['patient_id' => $otherPatient->id])->id,
    ]);

    $response = $this->actingAs($membership->user)->getJson("/api/v1/patients/{$patient->id}/prescriptions");

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(1);
    $response->assertJsonPath('data.0.id', $own->id);
});
