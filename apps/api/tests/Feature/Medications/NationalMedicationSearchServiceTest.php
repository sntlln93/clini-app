<?php

declare(strict_types=1);

use App\Data\Medications\MedicationCompositionData;
use App\Data\Medications\MedicationIngredientData;
use App\Data\Medications\MedicationProductData;
use App\Exceptions\Medications\MedicationSourceUnavailableException;
use App\Services\Medications\NationalMedicationSearchService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

const NATIONAL_MEDICATION_SEARCH_URL = 'cnpm.msal.gov.ar/api/vademecum';

beforeEach(function () {
    config([
        'services.national_medication_search.enabled' => true,
        'services.national_medication_search.url' => 'https://cnpm.msal.gov.ar',
        'services.national_medication_search.user_agent' => 'Clini/test',
    ]);
    Http::preventStrayRequests();
});

/**
 * @param  list<MedicationProductData>  $products
 */
function productByGtin(array $products, string $gtin): MedicationProductData
{
    return array_values(array_filter($products, fn (MedicationProductData $product) => $product->gtin === $gtin))[0];
}

test('a search sends only the term, as Clini, and reads every product of the answer', function () {
    Http::fake([NATIONAL_MEDICATION_SEARCH_URL => Http::response(nationalMedicationSearchFixture('migral.json'))]);

    $products = app(NationalMedicationSearchService::class)->search('Migral');

    expect($products)->toHaveCount(9);
    Http::assertSentCount(1);
    Http::assertSent(fn (Request $request) => $request->method() === 'POST'
        && $request->url() === 'https://cnpm.msal.gov.ar/api/vademecum'
        && $request->data() === ['searchdata' => 'Migral']
        && $request->hasHeader('User-Agent', 'Clini/test'));

    expect(productByGtin($products, '07795378001089'))->toEqual(new MedicationProductData(
        gtin: '07795378001089',
        name: 'MIGRAL',
        presentation: 'sup.x 10',
        pharmaceuticalForm: 'Supositorios',
        administrationRoute: 'rectal',
        laboratory: 'Montpellier',
        troquel: '730152',
        snomed: '239671000221103',
        drug: 'ergotamina+cafeína+asoc.',
        drugCode: '00378',
        therapeuticAction: 'Antimigrañoso',
        therapeuticActionCode: '00056',
        dispensingCondition: 'Venta Bajo Receta',
        controlMark: null,
        withdrawn: false,
        inForce: true,
        updatedOn: '2026-10-27',
        composition: new MedicationCompositionData([
            new MedicationIngredientData('ergotamina', 'ergotamina'),
            new MedicationIngredientData('cafeína', 'cafeína'),
        ], incomplete: true),
    ));
});

test('GTINs become GTIN-14, blanks become null and no-break spaces plain ones', function () {
    Http::fake([NATIONAL_MEDICATION_SEARCH_URL => Http::response(nationalMedicationSearchFixture('assorted.json'))]);

    $products = app(NationalMedicationSearchService::class)->search('plus');

    expect(array_map(fn (MedicationProductData $product) => strlen($product->gtin), $products))->each->toBe(14)
        ->and(productByGtin($products, '00000077944023')->name)->toBe('ARTROSTOP ENERGY')
        ->and(productByGtin($products, '07798420160130')->name)->toBe('GENOPRAZOL PLUS')
        ->and(productByGtin($products, '00073950317450')->name)->toBe('WATERPIK DUCHA BUCAL CORDLESS PLUS BLANCA')
        ->and(productByGtin($products, '00073950317450')->presentation)->toBe('irrigador bucal WP490x 1')
        ->and(productByGtin($products, '00073950317450')->snomed)->toBeNull()
        ->and(productByGtin($products, '00073950317450')->troquel)->toBeNull()
        ->and(productByGtin($products, '07790839980590')->snomed)->toBeNull();
});

test('the dispensing condition and the control mark are kept, and a withdrawn product says so', function () {
    Http::fake([NATIONAL_MEDICATION_SEARCH_URL => Http::response(nationalMedicationSearchFixture('assorted.json'))]);

    $products = app(NationalMedicationSearchService::class)->search('plus');
    $marks = fn (string $gtin) => [productByGtin($products, $gtin)->dispensingCondition, productByGtin($products, $gtin)->controlMark];

    expect($marks('07795375000702'))->toBe(['Venta Bajo Receta Archivada', 'ESTUPEFACIENTE III'])
        ->and($marks('07795378005568'))->toBe(['Venta Bajo Receta Archivada', 'PSICOTROPICO IV'])
        ->and($marks('07790375001728'))->toBe(['Venta Bajo Receta Archivada', 'VENTA VIGILADA'])
        ->and($marks('07790839980590'))->toBe(['Venta Bajo Receta', null])
        ->and(productByGtin($products, '07790440496725')->withdrawn)->toBeTrue()
        ->and(productByGtin($products, '07790839980590')->withdrawn)->toBeFalse();
});

test('each product\'s substances come from its drug text', function () {
    Http::fake([NATIONAL_MEDICATION_SEARCH_URL => Http::response(nationalMedicationSearchFixture('assorted.json'))]);

    $products = app(NationalMedicationSearchService::class)->search('plus');
    $substances = fn (string $gtin) => array_map(fn (MedicationIngredientData $ingredient) => $ingredient->substance, productByGtin($products, $gtin)->composition->ingredients);

    expect($substances('07795337907308'))->toBe(['clorfeniramina', 'ibuprofeno', 'pseudoefedrina'])
        ->and($substances('07791829000618'))->toBe(['amoxicilina', 'ácido clavulánico'])
        ->and($substances('07798389330100'))->toBe(['hioscina', 'ibuprofeno'])
        ->and($substances('07798420160130'))->toBe(['omeprazol', 'bicarbonato de sodio'])
        ->and(productByGtin($products, '00000077944023')->composition->incomplete)->toBeTrue();
});

test('a term nothing matches answers an empty list', function () {
    Http::fake([NATIONAL_MEDICATION_SEARCH_URL => Http::response('[]')]);

    expect(app(NationalMedicationSearchService::class)->search('actron plus'))->toBe([]);
});

test('a row without a usable GTIN or name is skipped, not the whole answer', function () {
    Http::fake([NATIONAL_MEDICATION_SEARCH_URL => Http::response([
        ['NOMBRE' => 'SIN GTIN', 'GTIN1' => ' '],
        ['NOMBRE' => ' ', 'GTIN1' => '07795378001089'],
        ['NOMBRE' => 'GTIN RARO', 'GTIN1' => '12AB'],
        'not a row',
        ['NOMBRE' => 'MIGRAL', 'GTIN1' => '7795378001089'],
    ])]);

    $products = app(NationalMedicationSearchService::class)->search('migral');

    expect(array_map(fn (MedicationProductData $product) => [$product->gtin, $product->name], $products))
        ->toBe([['07795378001089', 'MIGRAL']]);
});

test('an error, a timeout or an unreadable answer fails and pauses the source', function (string $failure) {
    Http::fake([NATIONAL_MEDICATION_SEARCH_URL => match ($failure) {
        'server error' => Http::response(nationalMedicationSearchFixture('short-term.txt'), 500),
        'timeout' => fn () => throw new ConnectionException('cURL error 28: Operation timed out'),
        'html' => Http::response('<html>Mantenimiento</html>'),
        'not a list' => Http::response(['error' => 'x']),
    }]);
    $service = app(NationalMedicationSearchService::class);

    expect($service->available())->toBeTrue()
        ->and(fn () => $service->search('migral'))->toThrow(MedicationSourceUnavailableException::class)
        ->and($service->available())->toBeFalse();
})->with(['server error', 'timeout', 'html', 'not a list']);

test('it is off unless turned on', function () {
    config(['services.national_medication_search.enabled' => false]);

    expect(app(NationalMedicationSearchService::class)->available())->toBeFalse();
});
