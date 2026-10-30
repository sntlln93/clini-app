<?php

declare(strict_types=1);

use App\Support\FoldedText;

test('folding drops case and Spanish accents', function () {
    expect(FoldedText::fold('ÁCIDO Acetilsalicílico'))->toBe('acido acetilsalicilico')
        ->and(FoldedText::fold('Pingüino Ñandú'))->toBe('pinguino nandu');
});

test('folding turns every run of whitespace into one space and trims the ends', function () {
    expect(FoldedText::fold("  Amoxicilina \t 500\n mg "))->toBe('amoxicilina 500 mg');
});
