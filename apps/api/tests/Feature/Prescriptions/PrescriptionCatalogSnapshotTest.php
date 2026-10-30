<?php

declare(strict_types=1);

use App\Models\Appointment;
use App\Models\MedicalHistoryEntry;
use App\Models\MedicationProduct;
use App\Models\Membership;
use App\Models\Prescription;
use App\Support\CurrentOrganization;

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
        ->withIngredients(['CAFEINA' => 'cafeina', 'ERGOTAMINA TARTRATO' => 'ergotamina', 'DIPIRONA SODICA' => 'dipirona'])
        ->create(['gtin' => '07795378001096', 'commercial_name' => 'MIGRAL 500']);
}

function catalogItem(array $overrides = []): array
{
    return ['medication' => 'MIGRAL 500', 'presentation' => null, 'dosage' => '1 cada 8 h', 'quantity' => 1, ...$overrides];
}

test('an item picked from the catalog keeps its GTIN and the substances the server copies from the catalog', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = catalogAppointment($membership);
    $product = migralProduct();

    $response = $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", ['items' => [
            catalogItem(['gtin' => $product->gtin, 'substances' => ['agua']]),
            catalogItem(['medication' => 'Agua destilada']),
        ]])
        ->assertCreated()
        ->assertJsonPath('data.items.0.gtin', '07795378001096')
        ->assertJsonPath('data.items.0.substances', ['cafeina', 'ergotamina', 'dipirona'])
        ->assertJsonPath('data.items.1.gtin', null)
        ->assertJsonPath('data.items.1.substances', null);

    // A later change in the catalog never rewrites the history.
    $product->ingredients()->delete();
    $item = Prescription::findOrFail($response->json('data.id'))->versions()->sole()->items()->firstOrFail();

    expect($item->substances)->toBe(['cafeina', 'ergotamina', 'dipirona']);
});

test('an item whose product\'s detail never arrived keeps its GTIN without substances', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = catalogAppointment($membership);
    $product = MedicationProduct::factory()->create();

    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", ['items' => [catalogItem(['gtin' => $product->gtin])]])
        ->assertCreated()
        ->assertJsonPath('data.items.0.gtin', $product->gtin)
        ->assertJsonPath('data.items.0.substances', null);
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
    $allergy->versions()->create(['version' => 2, 'membership_id' => $membership->id, 'description' => 'Dipirona', 'reaction' => 'Anafilaxia']);
    $product = migralProduct();

    // Typed as free text, the commercial name says nothing about dipyrone.
    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", ['items' => [catalogItem()]])
        ->assertCreated();

    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", ['items' => [catalogItem(['gtin' => $product->gtin])]])
        ->assertConflict()
        ->assertJsonPath('error.code', 'prescriptions.allergy_warning')
        ->assertJsonPath('error.context.allergies.0.description', 'Dipirona');
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

test('the export carries each item\'s GTIN and substances', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = catalogAppointment($membership);
    $product = migralProduct();
    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", ['items' => [catalogItem(['gtin' => $product->gtin])]])
        ->assertCreated();

    $this->actingAs($membership->user)
        ->getJson("/api/v1/patients/{$appointment->patient_id}/clinical-record?format=json")
        ->assertOk()
        ->assertJsonPath('appointments.0.prescriptions.0.versions.0.items.0.gtin', '07795378001096')
        ->assertJsonPath('appointments.0.prescriptions.0.versions.0.items.0.substances', ['cafeina', 'ergotamina', 'dipirona']);
});
