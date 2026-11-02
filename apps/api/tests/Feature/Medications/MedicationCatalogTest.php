<?php

declare(strict_types=1);

use App\Models\MedicationIngredient;
use App\Models\MedicationProduct;
use App\Models\MedicationSearch;
use App\Models\Membership;
use App\Support\CurrentOrganization;
use Illuminate\Support\Facades\Http;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

function searchMedications(Membership $membership, string $q): array
{
    return test()->actingAs($membership->user)
        ->getJson('/api/v1/medications?'.http_build_query(['q' => $q]))
        ->assertOk()
        ->json('data');
}

test('a term the catalog doesn\'t hold is asked once, and everything answered is kept', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $calls = fakeMedicationSource(['migral' => [
        sourceProduct('07795378001089', 'MIGRAL', 'ergotamina+cafeína+asoc.'),
        sourceProduct('07795378001454', 'MIGRAL II', 'ibuprofeno+ergotamina+cafeína'),
        sourceProduct('07795378009999', 'MIGRAL VIEJO', 'ibuprofeno', ['withdrawn' => true]),
    ]]);

    $found = searchMedications($membership, '  Migral ');

    expect(array_column($found, 'name'))->toBe(['MIGRAL', 'MIGRAL II'])
        ->and($calls->getArrayCopy())->toBe(['migral'])
        ->and(MedicationProduct::query()->count())->toBe(3)
        ->and(MedicationSearch::query()->sole()->term)->toBe('migral');
});

test('a product is answered with everything the form fills an item from', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    fakeMedicationSource(['mensalgin' => [sourceProduct('07795375000702', 'MENSALGIN', 'ibuprofeno+codeína', [
        'presentation' => 'comp.x 10',
        'dispensingCondition' => 'Venta Bajo Receta Archivada',
        'controlMark' => 'ESTUPEFACIENTE III',
    ])]]);

    expect(searchMedications($membership, 'mensalgin'))->toBe([[
        'gtin' => '07795375000702',
        'name' => 'MENSALGIN',
        'presentation' => 'comp.x 10',
        'pharmaceutical_form' => 'Comprimidos/Pastillas/Tabletas/Grageas',
        'administration_route' => 'oral',
        'laboratory' => 'Montpellier',
        'drug' => 'ibuprofeno+codeína',
        'therapeutic_action' => 'Analgésico Antiinflam.',
        'dispensing_condition' => 'Venta Bajo Receta Archivada',
        'control_mark' => 'ESTUPEFACIENTE III',
        'substances' => ['ibuprofeno', 'codeína'],
        'composition_incomplete' => false,
    ]]);
});

test('a term searched recently, or a longer one containing it, is answered by the catalog alone', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    MedicationProduct::factory()->create(['name' => 'MIGRAL II', 'drug' => 'ibuprofeno+ergotamina+cafeína']);
    MedicationSearch::query()->create(['term' => 'migral', 'searched_at' => now()->subDays(MedicationSearch::COVERAGE_DAYS - 1)]);
    $calls = fakeMedicationSource();

    expect(array_column(searchMedications($membership, 'MIGRAL'), 'name'))->toBe(['MIGRAL II'])
        ->and(array_column(searchMedications($membership, 'migral ii'), 'name'))->toBe(['MIGRAL II'])
        ->and($calls->getArrayCopy())->toBe([]);
});

test('a shorter term, or one last searched over thirty days ago, is asked again', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    MedicationSearch::query()->create(['term' => 'ibuprofeno', 'searched_at' => now()]);
    MedicationSearch::query()->create(['term' => 'migral', 'searched_at' => now()->subDays(MedicationSearch::COVERAGE_DAYS + 1)]);
    $calls = fakeMedicationSource();

    searchMedications($membership, 'ibupro');
    searchMedications($membership, 'migral');

    expect($calls->getArrayCopy())->toBe(['ibupro', 'migral'])
        ->and(MedicationSearch::query()->where('term', 'migral')->sole()->searched_at->isToday())->toBeTrue()
        ->and(MedicationSearch::query()->count())->toBe(3);
});

test('a term is asked and recorded without case, accented vowels or extra spaces', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $calls = fakeMedicationSource();

    searchMedications($membership, ' Cafeína   Plus ');

    expect($calls->getArrayCopy())->toBe(['cafeina plus'])
        ->and(MedicationSearch::query()->sole()->term)->toBe('cafeina plus');
});

test('«ñ» and «n» never cover each other', function (string $first, string $second) {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $calls = fakeMedicationSource();

    searchMedications($membership, $first);
    searchMedications($membership, $second);
    searchMedications($membership, $first);

    expect($calls->getArrayCopy())->toBe([mb_strtolower($first), mb_strtolower($second)])
        ->and(MedicationSearch::query()->pluck('term')->sort()->values()->all())->toBe(['compan', 'compañ']);
})->with([
    'ñ first' => ['COMPAÑ', 'compan'],
    'n first' => ['compan', 'COMPAÑ'],
]);

test('a product listed again is updated, and its substances replaced', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $product = MedicationProduct::factory()->withIngredients(['dipirona' => 'dipirona'])->create(['gtin' => '07795378001089', 'name' => 'MIGRAL']);
    fakeMedicationSource(['migral' => [sourceProduct('07795378001089', 'MIGRAL', 'ergotamina+cafeína+asoc.', ['dispensingCondition' => 'Venta Libre'])]]);

    searchMedications($membership, 'migral');

    expect($product->fresh()?->only(['name', 'dispensing_condition', 'composition_incomplete']))
        ->toBe(['name' => 'MIGRAL', 'dispensing_condition' => 'Venta Libre', 'composition_incomplete' => true])
        ->and($product->ingredients()->pluck('substance')->all())->toBe(['ergotamina', 'cafeína'])
        ->and(MedicationIngredient::query()->count())->toBe(2);
});

test('the catalog finds a product by its drug text too, ignoring accents', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    MedicationProduct::factory()->create(['name' => 'NOVALGINA', 'drug' => 'dipirona']);
    MedicationProduct::factory()->create(['name' => 'BIO CAFEINA FORTE', 'drug' => 'cafeína']);
    fakeMedicationSource(available: false);

    expect(array_column(searchMedications($membership, 'dipíroná'), 'name'))->toBe(['NOVALGINA'])
        ->and(array_column(searchMedications($membership, 'CAFEÍNA'), 'name'))->toBe(['BIO CAFEINA FORTE']);
});

test('suggestions leave out non-drugs and withdrawn products', function (array $attributes) {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    MedicationProduct::factory()->create(['name' => 'PLUS DROGA']);
    MedicationProduct::factory()->create(['name' => 'PLUS OTRO', ...$attributes]);
    fakeMedicationSource(available: false);

    expect(array_column(searchMedications($membership, 'plus d'), 'name'))->toBe(['PLUS DROGA'])
        ->and(array_column(searchMedications($membership, 'plus o'), 'name'))->toBe([]);
})->with([
    'accessory' => [['drug' => 'accesorio', 'therapeutic_action' => 'Accesorios']],
    'supplement' => [['drug' => 'cafeína', 'therapeutic_action' => 'Suplemento dietario']],
    'dental product' => [['drug' => 'accesorio', 'therapeutic_action' => 'Productos odontológicos']],
    'cosmetic' => [['drug' => 'producto cosmético', 'therapeutic_action' => 'Hidratante dérmico']],
    'withdrawn' => [['withdrawn' => true]],
]);

test('up to ten suggestions, the ones whose name starts with the term first', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    MedicationProduct::factory()->create(['name' => 'ACTRON', 'drug' => 'ibuprofeno']);
    MedicationProduct::factory()->count(11)->sequence(fn ($sequence) => ['name' => 'GENÉRICO '.chr(65 + $sequence->index)])->create(['drug' => 'actronol']);
    fakeMedicationSource(available: false);

    $found = array_column(searchMedications($membership, 'actron'), 'name');

    expect($found)->toHaveCount(10)->and($found[0])->toBe('ACTRON')->and($found[1])->toBe('GENÉRICO A');
});

test('when the source fails or is off, the catalog answers with what it holds and remembers no search', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    MedicationProduct::factory()->create(['name' => 'MIGRAL II']);
    fakeMedicationSource(failing: true);

    expect(array_column(searchMedications($membership, 'migral'), 'name'))->toBe(['MIGRAL II'])
        ->and(MedicationSearch::query()->count())->toBe(0);

    $calls = fakeMedicationSource(available: false);
    searchMedications($membership, 'migral');

    expect($calls->getArrayCopy())->toBe([]);
});

test('through the national medication search, a search keeps its answer and a failure pauses it', function () {
    config([
        'services.national_medication_search.enabled' => true,
        'services.national_medication_search.url' => 'https://cnpm.msal.gov.ar',
    ]);
    Http::preventStrayRequests();
    Http::fake(['cnpm.msal.gov.ar/api/vademecum' => Http::sequence()
        ->push(nationalMedicationSearchFixture('migral.json'))
        ->push('Error', 500)]);
    $membership = Membership::factory()->onPaidPlan()->professional()->create();

    $migral = searchMedications($membership, 'migral');
    searchMedications($membership, 'migral compositum');

    expect(array_values(array_unique(array_column($migral, 'name'))))->toBe(['MIGRAL', 'MIGRAL COMPOSITUM', 'MIGRAL II'])
        ->and($migral[0]['substances'])->toBe(['ergotamina', 'cafeína'])
        ->and($migral[0]['composition_incomplete'])->toBeTrue();
    Http::assertSentCount(1);

    // Down: the catalog answers with what it holds, and the next searches don't ask until the pause ends.
    expect(array_column(searchMedications($membership, 'compositum'), 'name'))->toHaveCount(3);
    searchMedications($membership, 'compositum');

    Http::assertSentCount(2);
});

test('a search needs five characters and the plan that indicates medication', function () {
    $paid = Membership::factory()->onPaidPlan()->professional()->create();
    $free = Membership::factory()->professional()->create();
    fakeMedicationSource(available: false);

    $this->actingAs($paid->user)->getJson('/api/v1/medications?q='.urlencode(' ibu '))->assertUnprocessable()->assertJsonValidationErrors('q');
    // Counted as it would be asked: «a e».
    $this->actingAs($paid->user)->getJson('/api/v1/medications?q='.urlencode('a   e'))->assertUnprocessable()->assertJsonValidationErrors('q');
    app(CurrentOrganization::class)->set(null);
    $this->actingAs($free->user)->getJson('/api/v1/medications?q=ibuprofeno')->assertConflict()->assertJsonPath('error.code', 'plans.feature_unavailable');
});

test('the catalog is read-only and needs a session', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $product = MedicationProduct::factory()->create();

    $this->getJson('/api/v1/medications?q=ibuprofeno')->assertUnauthorized();
    $this->actingAs($membership->user)->postJson('/api/v1/medications', [])->assertMethodNotAllowed();
    $this->actingAs($membership->user)->getJson("/api/v1/medications/{$product->gtin}")->assertNotFound();
});
