<?php

declare(strict_types=1);

use App\Models\Appointment;
use App\Models\MedicalHistoryEntry;
use App\Models\MedicationProduct;
use App\Models\Membership;
use App\Models\Prescription;
use App\Support\CurrentOrganization;
use App\Support\MedicationComposition;
use Illuminate\Support\Arr;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

/**
 * Today, so the patient's history opens without a reason (#325).
 */
function catalogAppointment(Membership $membership): Appointment
{
    return Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'start_at' => now(),
        'end_at' => now()->addMinutes(30),
    ]);
}

function migralProduct(): MedicationProduct
{
    return MedicationProduct::factory()
        ->withIngredients(['ibuprofeno' => 'ibuprofeno', 'ergotamina' => 'ergotamina', 'cafeína' => 'cafeína'])
        ->create([
            'gtin' => '07795378001454',
            'name' => 'MIGRAL II',
            'snomed' => '179851000221106',
            'drug' => 'ibuprofeno+ergotamina+cafeína',
            'dispensing_condition' => 'Venta Bajo Receta',
        ]);
}

function catalogItem(array $overrides = []): array
{
    return ['medication' => 'MIGRAL II', 'presentation' => null, 'dosage' => '1 cada 8 h', 'quantity' => 1, ...$overrides];
}

test('an item picked from the catalog keeps what the server copies of its product, never what the request says', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = catalogAppointment($membership);
    $product = migralProduct();

    $response = $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", ['items' => [
            catalogItem([
                'gtin' => $product->gtin,
                'snomed' => '1',
                'substances' => ['agua'],
                'dispensing_condition' => 'Venta Libre',
                'control_mark' => null,
                'composition_incomplete' => true,
            ]),
            catalogItem(['medication' => 'Agua destilada']),
        ]])
        ->assertCreated();
    $item = fn (int $position): array => collect($response->json('data.items'))->firstWhere('position', $position);

    expect(Arr::except($item(0), ['id', 'position']))->toBe([
        'medication' => 'MIGRAL II',
        'presentation' => null,
        'dosage' => '1 cada 8 h',
        'quantity' => 1,
        'gtin' => '07795378001454',
        'snomed' => '179851000221106',
        'substances' => ['ibuprofeno', 'ergotamina', 'cafeína'],
        'dispensing_condition' => 'Venta Bajo Receta',
        'control_mark' => null,
        'composition_incomplete' => false,
    ])->and(Arr::only($item(1), ['gtin', 'snomed', 'substances', 'dispensing_condition', 'control_mark', 'composition_incomplete']))->toBe([
        'gtin' => null,
        'snomed' => null,
        'substances' => null,
        'dispensing_condition' => null,
        'control_mark' => null,
        'composition_incomplete' => null,
    ]);

    // A later change in the catalog never rewrites the history.
    $product->ingredients()->delete();
    $product->update(['dispensing_condition' => 'Venta Libre']);
    $kept = Prescription::findOrFail($response->json('data.id'))->versions()->sole()->items()->orderBy('position')->firstOrFail();

    expect($kept->substances)->toBe(['ibuprofeno', 'ergotamina', 'cafeína'])
        ->and($kept->dispensing_condition)->toBe('Venta Bajo Receta');
});

test('a controlled product is kept with its marks, not blocked', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = catalogAppointment($membership);
    $product = MedicationProduct::factory()->withIngredients(['venlafaxina' => 'venlafaxina'])->create([
        'name' => 'MAXIBRAL XR',
        'drug' => 'venlafaxina',
        'dispensing_condition' => 'Venta Bajo Receta Archivada',
        'control_mark' => 'PSICOTROPICO IV',
    ]);

    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", ['items' => [catalogItem(['medication' => 'MAXIBRAL XR', 'gtin' => $product->gtin])]])
        ->assertCreated()
        ->assertJsonPath('data.items.0.dispensing_condition', 'Venta Bajo Receta Archivada')
        ->assertJsonPath('data.items.0.control_mark', 'PSICOTROPICO IV')
        ->assertJsonPath('data.items.0.substances', ['venlafaxina']);
});

test('a product whose drug text names nothing keeps its GTIN with no substances', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = catalogAppointment($membership);
    $product = MedicationProduct::factory()->create(['drug' => null]);

    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", ['items' => [catalogItem(['gtin' => $product->gtin])]])
        ->assertCreated()
        ->assertJsonPath('data.items.0.gtin', $product->gtin)
        ->assertJsonPath('data.items.0.substances', []);
});

test('a product whose drug text the source cut short keeps that its substances miss some', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = catalogAppointment($membership);
    $product = MedicationProduct::factory()->withIngredients(['ergotamina' => 'ergotamina', 'cafeína' => 'cafeína'])->create([
        'name' => 'MIGRAL',
        'drug' => 'ergotamina+cafeína+asoc.',
        'composition_incomplete' => true,
    ]);
    $prescriptionId = $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", ['items' => [catalogItem(['medication' => 'MIGRAL', 'gtin' => $product->gtin])]])
        ->assertCreated()
        ->assertJsonPath('data.items.0.substances', ['ergotamina', 'cafeína'])
        ->assertJsonPath('data.items.0.composition_incomplete', true)
        ->json('data.id');

    // An amendment that keeps the product keeps the version's copy, even once the catalog lists every substance.
    $product->update(['composition_incomplete' => false]);

    $this->actingAs($membership->user)
        ->postJson("/api/v1/prescriptions/{$prescriptionId}/amendments", ['items' => [catalogItem(['medication' => 'MIGRAL', 'gtin' => $product->gtin, 'dosage' => '1 cada 12 h'])]])
        ->assertCreated()
        ->assertJsonPath('data.items.0.composition_incomplete', true);
});

test('a GTIN the catalog doesn\'t hold is rejected', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = catalogAppointment($membership);

    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", ['items' => [catalogItem(['gtin' => '07790000000000'])]])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('items.0.gtin');
});

test('an allergy to a substance warns about a product picked by its commercial name', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = catalogAppointment($membership);
    $allergy = MedicalHistoryEntry::factory()->create(['appointment_id' => $appointment->id]);
    $allergy->versions()->create(['version' => 2, 'membership_id' => $membership->id, 'description' => 'Cafeína', 'reaction' => 'Anafilaxia']);
    $product = migralProduct();

    // Typed as free text, the commercial name says nothing about caffeine.
    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", ['items' => [catalogItem()]])
        ->assertCreated();

    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", ['items' => [catalogItem(['gtin' => $product->gtin])]])
        ->assertConflict()
        ->assertJsonPath('error.code', 'prescriptions.allergy_warning')
        ->assertJsonPath('error.context.allergies.0.description', 'Cafeína');
});

test('amending an item picked from the catalog with the same product is unchanged', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = catalogAppointment($membership);
    $product = migralProduct();
    $prescriptionId = $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", ['items' => [catalogItem(['gtin' => $product->gtin])]])
        ->assertCreated()
        ->json('data.id');

    $this->actingAs($membership->user)
        ->postJson("/api/v1/prescriptions/{$prescriptionId}/amendments", ['items' => [catalogItem(['gtin' => $product->gtin])]])
        ->assertConflict()
        ->assertJsonPath('error.code', 'prescriptions.amendment_unchanged');

    $this->actingAs($membership->user)
        ->postJson("/api/v1/prescriptions/{$prescriptionId}/amendments", ['items' => [catalogItem()]])
        ->assertCreated()
        ->assertJsonPath('data.items.0.gtin', null);
});

test('an amendment that keeps a product keeps the version\'s copy of it, whatever the catalog says now', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = catalogAppointment($membership);
    $product = migralProduct();
    $prescriptionId = $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", ['items' => [catalogItem(['gtin' => $product->gtin])]])
        ->assertCreated()
        ->json('data.id');
    $product->update(['snomed' => '1', 'control_mark' => 'VENTA VIGILADA']);
    $product->ingredients()->delete();

    $this->actingAs($membership->user)
        ->postJson("/api/v1/prescriptions/{$prescriptionId}/amendments", ['items' => [catalogItem(['gtin' => $product->gtin])]])
        ->assertConflict()
        ->assertJsonPath('error.code', 'prescriptions.amendment_unchanged');

    $this->actingAs($membership->user)
        ->postJson("/api/v1/prescriptions/{$prescriptionId}/amendments", ['items' => [catalogItem(['gtin' => $product->gtin, 'dosage' => '1 cada 12 h'])]])
        ->assertCreated()
        ->assertJsonPath('data.items.0.dosage', '1 cada 12 h')
        ->assertJsonPath('data.items.0.snomed', '179851000221106')
        ->assertJsonPath('data.items.0.substances', ['ibuprofeno', 'ergotamina', 'cafeína'])
        ->assertJsonPath('data.items.0.control_mark', null);
});

test('an allergy to one vitamin warns about a product whose drug text lists several', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = catalogAppointment($membership);
    $allergy = MedicalHistoryEntry::factory()->create(['appointment_id' => $appointment->id]);
    $allergy->versions()->create(['version' => 2, 'membership_id' => $membership->id, 'description' => 'Vitamina B12']);
    $composition = MedicationComposition::of('cafeína+vit.b1 b6 b12');
    $product = MedicationProduct::factory()
        ->afterCreating(function (MedicationProduct $product) use ($composition): void {
            foreach ($composition->ingredients as $position => $ingredient) {
                $product->ingredients()->create(['position' => $position, ...$ingredient->toArray()]);
            }
        })
        ->create(['name' => 'BIO CAFEINA FORTE', 'drug' => 'cafeína+vit.b1 b6 b12']);

    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", ['items' => [catalogItem(['medication' => 'BIO CAFEINA FORTE', 'gtin' => $product->gtin])]])
        ->assertConflict()
        ->assertJsonPath('error.code', 'prescriptions.allergy_warning')
        ->assertJsonPath('error.context.allergies.0.description', 'Vitamina B12');
});

test('the export carries what each item kept of its product', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = catalogAppointment($membership);
    $product = migralProduct();
    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", ['items' => [catalogItem(['gtin' => $product->gtin])]])
        ->assertCreated();

    $this->actingAs($membership->user)
        ->getJson("/api/v1/patients/{$appointment->patient_id}/clinical-record?format=json")
        ->assertOk()
        ->assertJsonPath('appointments.0.prescriptions.0.versions.0.items.0.gtin', '07795378001454')
        ->assertJsonPath('appointments.0.prescriptions.0.versions.0.items.0.snomed', '179851000221106')
        ->assertJsonPath('appointments.0.prescriptions.0.versions.0.items.0.substances', ['ibuprofeno', 'ergotamina', 'cafeína'])
        ->assertJsonPath('appointments.0.prescriptions.0.versions.0.items.0.dispensing_condition', 'Venta Bajo Receta')
        ->assertJsonPath('appointments.0.prescriptions.0.versions.0.items.0.control_mark', null)
        ->assertJsonPath('appointments.0.prescriptions.0.versions.0.items.0.composition_incomplete', false);
});
