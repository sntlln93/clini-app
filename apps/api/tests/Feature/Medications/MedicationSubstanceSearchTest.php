<?php

declare(strict_types=1);

use App\Models\Appointment;
use App\Models\MedicationProduct;
use App\Models\MedicationSearch;
use App\Models\Membership;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

/**
 * @return list<string>
 */
function searchSubstances(Membership $membership, string $q): array
{
    return test()->actingAs($membership->user)
        ->getJson('/api/v1/medication-substances?'.http_build_query(['q' => $q]))
        ->assertOk()
        ->json('data');
}

/**
 * @param  array<string, string>  $ingredients  substance by the name the drug text gives it
 * @param  array<string, mixed>  $attributes
 */
function productWithSubstances(string $name, array $ingredients, array $attributes = []): MedicationProduct
{
    return MedicationProduct::factory()->withIngredients($ingredients)->create(['name' => $name, ...$attributes]);
}

test('a term the catalog doesn\'t hold fills it from the source, and its substances are suggested once each', function () {
    $membership = Membership::factory()->professional()->create();
    $calls = fakeMedicationSource(['amoxicilina' => [
        sourceProduct('07795300000001', 'AMOXIDAL', 'amoxicilina'),
        sourceProduct('07795300000002', 'AMOXIDAL DUO', 'amoxicilina+clavulánico,ác.'),
        sourceProduct('07795300000003', 'OPTAMOX', 'amoxicilina+sulbactam'),
    ]]);

    expect(searchSubstances($membership, ' Amoxicilina '))->toBe(['amoxicilina'])
        ->and($calls->getArrayCopy())->toBe(['amoxicilina'])
        ->and(MedicationProduct::query()->count())->toBe(3)
        ->and(MedicationSearch::query()->sole()->term)->toBe('amoxicilina');
});

test('a substance is found inside its name, ignoring case and accents, the ones starting with the term first', function () {
    $membership = Membership::factory()->professional()->create();
    productWithSubstances('CLAVUPEN', ['clavulánico,ác.' => 'ácido clavulánico']);
    productWithSubstances('CLAVUSAN', ['clavulanato' => 'clavulanato']);
    fakeMedicationSource(available: false);

    expect(searchSubstances($membership, 'CLAVULÁ'))->toBe(['clavulanato', 'ácido clavulánico']);
});

test('two spellings of a substance that fold alike are suggested once', function () {
    $membership = Membership::factory()->professional()->create();
    productWithSubstances('BIO CAFEINA FORTE', ['cafeina' => 'cafeina']);
    productWithSubstances('MIGRAL II', ['cafeína' => 'cafeína', 'ergotamina' => 'ergotamina']);
    fakeMedicationSource(available: false);

    expect(searchSubstances($membership, 'cafei'))->toBe(['cafeína']);
});

test('substances of non-drugs and withdrawn products are left out', function (array $attributes) {
    $membership = Membership::factory()->professional()->create();
    productWithSubstances('NOVALGINA', ['dipirona' => 'dipirona']);
    productWithSubstances('OTRO', ['dipironax' => 'dipironax'], $attributes);
    fakeMedicationSource(available: false);

    expect(searchSubstances($membership, 'dipiro'))->toBe(['dipirona']);
})->with([
    'supplement' => [['therapeutic_action' => 'Suplemento dietario']],
    'withdrawn' => [['withdrawn' => true]],
]);

test('up to ten suggestions', function () {
    $membership = Membership::factory()->professional()->create();
    foreach (range('a', 'l') as $letter) {
        productWithSubstances("VITA {$letter}", ["vit.{$letter}" => "vitamina {$letter}"]);
    }
    fakeMedicationSource(available: false);

    $found = searchSubstances($membership, 'vitamina');

    expect($found)->toHaveCount(10)->and($found[0])->toBe('vitamina a');
});

test('a term searched recently, or a longer one containing it, is answered by the catalog alone', function () {
    $membership = Membership::factory()->professional()->create();
    productWithSubstances('AMOXIDAL', ['amoxicilina' => 'amoxicilina']);
    MedicationSearch::query()->create(['term' => 'amoxi', 'searched_at' => now()->subDay()]);
    $calls = fakeMedicationSource();

    expect(searchSubstances($membership, 'amoxicilina'))->toBe(['amoxicilina'])
        ->and($calls->getArrayCopy())->toBe([]);
});

test('when the source fails or is off, the catalog answers with what it holds and remembers no search', function () {
    $membership = Membership::factory()->professional()->create();
    productWithSubstances('AMOXIDAL', ['amoxicilina' => 'amoxicilina']);
    fakeMedicationSource(failing: true);

    expect(searchSubstances($membership, 'amoxicilina'))->toBe(['amoxicilina'])
        ->and(MedicationSearch::query()->count())->toBe(0);

    $calls = fakeMedicationSource(available: false);

    expect(searchSubstances($membership, 'amoxicilina'))->toBe(['amoxicilina'])
        ->and($calls->getArrayCopy())->toBe([]);
});

test('every plan searches substances, from five characters on and with a session', function () {
    $free = Membership::factory()->professional()->create();
    $paid = Membership::factory()->onPaidPlan()->professional()->create();
    productWithSubstances('AMOXIDAL', ['amoxicilina' => 'amoxicilina']);
    fakeMedicationSource(available: false);

    expect(searchSubstances($free, 'amoxi'))->toBe(['amoxicilina']);
    app(CurrentOrganization::class)->set(null);
    expect(searchSubstances($paid, 'amoxi'))->toBe(['amoxicilina']);

    $this->actingAs($paid->user)->getJson('/api/v1/medication-substances?q='.urlencode(' amo '))->assertUnprocessable()->assertJsonValidationErrors('q');
    $this->actingAs($paid->user)->getJson('/api/v1/medication-substances')->assertUnprocessable()->assertJsonValidationErrors('q');
    auth()->forgetGuards();
    $this->getJson('/api/v1/medication-substances?q=amoxicilina')->assertUnauthorized();
});

test('an allergy recorded with a suggested substance warns about a catalog product whose name doesn\'t mention it', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'start_at' => now(),
        'end_at' => now()->addMinutes(30),
    ]);
    $product = productWithSubstances('MIGRAL II', ['ibuprofeno' => 'ibuprofeno', 'ergotamina' => 'ergotamina', 'cafeína' => 'cafeína'], [
        'drug' => 'ibuprofeno+ergotamina+cafeína',
    ]);
    fakeMedicationSource(available: false);

    [$substance] = searchSubstances($membership, 'ergotamina');
    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/medical-history-entries", ['category' => 'allergy', 'description' => $substance])
        ->assertCreated();

    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", ['items' => [
            ['medication' => 'MIGRAL II', 'gtin' => $product->gtin, 'presentation' => null, 'dosage' => '1 cada 8 h', 'quantity' => 1],
        ]])
        ->assertConflict()
        ->assertJsonPath('error.code', 'prescriptions.allergy_warning')
        ->assertJsonPath('error.context.allergies.0.description', 'ergotamina');
});
