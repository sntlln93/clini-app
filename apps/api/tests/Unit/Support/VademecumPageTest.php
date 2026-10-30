<?php

declare(strict_types=1);

use App\Data\Medications\MedicationIngredientData;
use App\Data\Medications\MedicationListingData;
use App\Support\VademecumPage;

test('the listing page gives its desktop, the path its events go to and its search components', function () {
    $html = vademecumFixture('listado.html');

    expect(VademecumPage::desktopId($html))->toBe('z_1y40')
        ->and(VademecumPage::updatePath($html))->toBe('/vademecum/zkau;jsessionid=BB587BE36C0C6B60F21268702D5F57B0')
        ->and(VademecumPage::searchComponents($html))->toBe([
            'commercial' => 'zk_comp_34',
            'generic' => 'zk_comp_28',
            'search' => 'zk_comp_80',
        ]);
});

test('a page without the search components gives none', function () {
    expect(VademecumPage::searchComponents('<html>mantenimiento</html>'))->toBeNull()
        ->and(VademecumPage::desktopId('<html></html>'))->toBeNull();
});

test('a search response gives each product with the component that opens its detail', function () {
    $products = VademecumPage::listing(vademecumFixture('busqueda.txt'));

    expect($products)->toHaveCount(2)
        ->and($products[0]['detail'])->toBe('zk_comp_327')
        ->and($products[1]['detail'])->toBe('zk_comp_347')
        ->and($products[0]['listing'])->toEqual(new MedicationListingData(
            gtin: '07795378001096',
            certificateNumber: '19504',
            laboratory: 'QUIMICA MONTPELLIER S A',
            commercialName: 'MIGRAL 500',
            pharmaceuticalForm: 'COMPRIMIDO RECUBIERTO',
            presentation: 'BLISTER por 20 UNIDADES',
            genericName: 'CAFEINA 100 MG + ERGOTAMINA TARTRATO 1 MG + DIPIRONA SODICA 500 MG',
        ))
        ->and($products[1]['listing']->commercialName)->toBe('MIGRAL COMPOSITUM');
});

test('a click on a product answers where its detail is', function () {
    expect(VademecumPage::redirect(vademecumFixture('redireccion.json')))->toBe('/vademecum/views/consultaPublica/presentacion.zul')
        ->and(VademecumPage::redirect('{"rs":[],"rid":3}'))->toBeNull()
        ->and(VademecumPage::redirect('no es json'))->toBeNull();
});

test('the detail page gives the active ingredients and how the product is given and dispensed', function () {
    $detail = VademecumPage::detail(vademecumFixture('presentacion.html'));

    expect($detail?->gtin)->toBe('07795378001096')
        ->and($detail?->administrationRoute)->toBe('ORAL')
        ->and($detail?->dispensingCondition)->toBe('BAJO RECETA')
        ->and($detail?->troquel)->toBe('303248')
        ->and($detail?->ingredients)->toEqual([
            new MedicationIngredientData('CAFEINA', '100', 'MG', null, null, null),
            new MedicationIngredientData('ERGOTAMINA TARTRATO', '1', 'MG', null, null, null),
            new MedicationIngredientData('DIPIRONA SODICA', '500', 'MG', null, null, null),
        ]);
});

test('a detail page without a GTIN gives no detail', function () {
    expect(VademecumPage::detail(vademecumFixture('listado.html')))->toBeNull();
});
