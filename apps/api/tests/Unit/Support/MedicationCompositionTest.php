<?php

declare(strict_types=1);

use App\Data\Medications\MedicationIngredientData;
use App\Support\MedicationComposition;

test('a piece of the drug text names its substance, expanded, without its salt and with its accents', function (string $name, string $substance) {
    expect(MedicationComposition::substances($name))->toBe([$substance]);
})->with([
    'plain' => ['ibuprofeno', 'ibuprofeno'],
    'accents' => ['Cafeína', 'cafeína'],
    'abbreviation' => ['pseudoef.', 'pseudoefedrina'],
    'another abbreviation' => ['clorfeniram.', 'clorfeniramina'],
    'accented abbreviation' => ['colag.', 'colágeno'],
    'abbreviated combination' => ['hidrocloroti.', 'hidroclorotiazida'],
    'inverted acid' => ['clavulánico,ác.', 'ácido clavulánico'],
    'acid first' => ['ác.clavulánico', 'ácido clavulánico'],
    'inverted salt' => ['metformina,clorh.', 'metformina'],
    'inverted salt abbreviation' => ['hioscina,n-butilbr.', 'hioscina'],
    'inverted citrate' => ['cafeína,citrato', 'cafeína'],
    'cation first' => ['sodio,bicarbonato', 'bicarbonato de sodio'],
    'oxide' => ['zinc,óxido', 'óxido de zinc'],
    'trailing salt' => ['clorfeniramina maleato', 'clorfeniramina'],
    'trailing salt abbreviation' => ['memantine clorh.', 'memantine'],
    'trailing adjective salt' => ['diclofenac potásico', 'diclofenac'],
    'salts in brackets' => ['betametasona (acet.y fosf.disod)', 'betametasona'],
    'unclosed brackets' => ['betametasona (diprop.y f.disod.)', 'betametasona'],
    'leading salt' => ['clorhidrato de metformina', 'metformina'],
    'vitamin' => ['vit.b12', 'vitamina b12'],
    'vitamin and its salt' => ['vit.e acetato', 'vitamina e'],
    'unknown abbreviation' => ['atorvastatín', 'atorvastatín'],
    'only a form word' => ['sulfato', 'sulfato'],
]);

test('a list of vitamins names each one', function () {
    expect(MedicationComposition::substances('vit.b1 b6 b12'))->toBe(['vitamina b1', 'vitamina b6', 'vitamina b12'])
        ->and(MedicationComposition::of('cafeína+vit.b1 b6 b12')->ingredients)->toEqual([
            new MedicationIngredientData('cafeína', 'cafeína'),
            new MedicationIngredientData('vit.b1 b6 b12', 'vitamina b1'),
            new MedicationIngredientData('vit.b1 b6 b12', 'vitamina b6'),
            new MedicationIngredientData('vit.b1 b6 b12', 'vitamina b12'),
        ]);
});

test('a drug text is split into its substances, in order', function () {
    $composition = MedicationComposition::of('clorfeniramina maleato+ibuprofeno+pseudoef.');

    expect($composition->ingredients)->toEqual([
        new MedicationIngredientData('clorfeniramina maleato', 'clorfeniramina'),
        new MedicationIngredientData('ibuprofeno', 'ibuprofeno'),
        new MedicationIngredientData('pseudoef.', 'pseudoefedrina'),
    ])->and($composition->incomplete)->toBeFalse();
});

test('an association cut short is marked incomplete, and nothing is guessed in its place', function () {
    $composition = MedicationComposition::of('ergotamina+cafeína+asoc.');

    expect(array_map(fn (MedicationIngredientData $ingredient) => $ingredient->substance, $composition->ingredients))
        ->toBe(['ergotamina', 'cafeína'])
        ->and($composition->incomplete)->toBeTrue();
});

test('a product without a drug text names nothing', function (?string $drug) {
    $composition = MedicationComposition::of($drug);

    expect($composition->ingredients)->toBe([])->and($composition->incomplete)->toBeFalse();
})->with([null, '', ' + ']);
