<?php

declare(strict_types=1);

use App\Models\Appointment;
use App\Models\Membership;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\Specialty;
use App\Support\CurrentOrganization;

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
        'diagnosis' => 'Faringitis aguda',
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
    $membership = Membership::factory()->professional()->create();
    $appointment = prescriptionOwnAppointment($membership);

    $response = $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", prescriptionPayload());

    $response->assertCreated()
        ->assertJsonPath('data.diagnosis', 'Faringitis aguda')
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
    $membership = Membership::factory()->professional()->create();
    $appointment = prescriptionOwnAppointment($membership);
    $other = Membership::factory()->create();
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

test('store accepts a prescription without diagnosis', function () {
    $membership = Membership::factory()->professional()->create();
    $appointment = prescriptionOwnAppointment($membership);

    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", prescriptionPayload(['diagnosis' => null]))
        ->assertCreated()
        ->assertJsonPath('data.diagnosis', null);
});

test('store returns 422 when items are missing or empty', function (mixed $items) {
    $membership = Membership::factory()->professional()->create();
    $appointment = prescriptionOwnAppointment($membership);

    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", ['diagnosis' => 'x', 'items' => $items])
        ->assertStatus(422)
        ->assertJsonValidationErrors('items');

    expect(Prescription::count())->toBe(0);
})->with([
    'missing' => [null],
    'empty' => [[]],
]);

test('store returns 422 for an invalid item', function (array $item, string $field) {
    $membership = Membership::factory()->professional()->create();
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
    $membership = Membership::factory()->professional()->create();
    $appointment = prescriptionOwnAppointment($membership);
    $otherAppointment = prescriptionOwnAppointment($membership);
    $prescription = Prescription::factory()->create(['appointment_id' => $appointment->id]);
    Prescription::factory()->create(['appointment_id' => $otherAppointment->id]);

    $response = $this->actingAs($membership->user)->getJson("/api/v1/appointments/{$appointment->id}/prescriptions");

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(1);
    $response->assertJsonPath('data.0.id', $prescription->id);
});

test('show returns the printable fields: patient identity and author name/specialties', function () {
    $membership = Membership::factory()->professional()->create();
    $patient = Patient::factory()->create(['name' => 'Juana Pérez', 'document_number' => '30111222']);
    $appointment = prescriptionOwnAppointment($membership, ['patient_id' => $patient->id]);
    $prescription = Prescription::factory()->create(['appointment_id' => $appointment->id]);
    $specialty = Specialty::query()->first() ?? Specialty::create(['name' => 'Clínica médica']);
    $membership->user->specialties()->syncWithoutDetaching([$specialty->id]);
    $membership->specialties()->attach($specialty->id, [
        'organization_id' => $membership->organization_id,
        'user_id' => $membership->user_id,
    ]);

    $response = $this->actingAs($membership->user)->getJson("/api/v1/prescriptions/{$prescription->id}");

    $response->assertOk()
        ->assertJsonPath('data.patient_name', 'Juana Pérez')
        ->assertJsonPath('data.patient_document_number', '30111222')
        ->assertJsonPath('data.author_name', $membership->user->name)
        ->assertJsonPath('data.author_specialties', [$specialty->name])
        ->assertJsonPath('data.items.0.medication', 'Amoxicilina');
});

test('update replaces diagnosis and items, keeping issued_at', function () {
    $membership = Membership::factory()->professional()->create();
    $appointment = prescriptionOwnAppointment($membership);
    $prescription = Prescription::factory()->create([
        'appointment_id' => $appointment->id,
        'issued_at' => now()->subDay()->startOfSecond(),
    ]);
    $issuedAt = $prescription->issued_at;

    $response = $this->actingAs($membership->user)->patchJson("/api/v1/prescriptions/{$prescription->id}", [
        'diagnosis' => 'Diagnóstico corregido',
        'items' => [
            ['medication' => 'Paracetamol', 'presentation' => '500 mg', 'dosage' => '1 cada 6 h', 'quantity' => 3],
        ],
    ]);

    $response->assertOk()
        ->assertJsonPath('data.diagnosis', 'Diagnóstico corregido')
        ->assertJsonPath('data.items.0.medication', 'Paracetamol');
    expect($response->json('data.items'))->toHaveCount(1);

    $fresh = $prescription->fresh();
    expect($fresh->items)->toHaveCount(1)
        ->and($fresh->items->first()->quantity)->toBe(3)
        ->and($fresh->issued_at->equalTo($issuedAt))->toBeTrue();
});

test('update returns 422 when the items list is emptied', function () {
    $membership = Membership::factory()->professional()->create();
    $appointment = prescriptionOwnAppointment($membership);
    $prescription = Prescription::factory()->create(['appointment_id' => $appointment->id]);

    $this->actingAs($membership->user)->patchJson("/api/v1/prescriptions/{$prescription->id}", ['items' => []])
        ->assertStatus(422)
        ->assertJsonValidationErrors('items');

    expect($prescription->items()->count())->toBe(1);
});

test('the patient listing returns only the acting membership\'s prescriptions for that patient', function () {
    $membership = Membership::factory()->professional()->create();
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
