<?php

declare(strict_types=1);

use App\Support\MedicationSubstance;

test('an ingredient is its substance without the salt or hydrate it comes as', function (string $ingredient, string $substance) {
    expect(MedicationSubstance::base($ingredient))->toBe($substance);
})->with([
    'trailing salt' => ['DIPIRONA SODICA', 'dipirona'],
    'tartrate' => ['ERGOTAMINA TARTRATO', 'ergotamina'],
    'anhydrous' => ['CAFEINA ANHIDRA', 'cafeina'],
    'leading salt' => ['CLORHIDRATO DE METFORMINA', 'metformina'],
    'hydrate' => ['AMOXICILINA TRIHIDRATO', 'amoxicilina'],
    'plain' => ['IBUPROFENO', 'ibuprofeno'],
    'accents' => ['ÁCIDO ACETILSALICÍLICO', 'acido acetilsalicilico'],
]);

test('an ingredient that is only a form word keeps its name', function () {
    expect(MedicationSubstance::base('SULFATO'))->toBe('sulfato');
});
