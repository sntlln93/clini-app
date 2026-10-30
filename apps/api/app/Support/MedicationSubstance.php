<?php

declare(strict_types=1);

namespace App\Support;

/**
 * The substance an active ingredient is, without the salt or hydrate it comes as (#377): ANMAT lists «DIPIRONA
 * SODICA» on one product and «DIPIRONA» on another, and an allergy to dipyrone is to both. Folded like the rest of the
 * text the allergy warning compares (`FoldedText`).
 */
class MedicationSubstance
{
    /**
     * Salts, hydrates and the like, folded, as ANMAT writes them before or after the substance.
     */
    private const array FORMS = [
        'acetato', 'anhidra', 'anhidro', 'base', 'benzoato', 'besilato', 'bitartrato', 'bromhidrato', 'butirato',
        'calcica', 'calcico', 'citrato', 'clorhidrato', 'dihidrato', 'dipropionato', 'disodica', 'disodico',
        'estearato', 'fosfato', 'fumarato', 'gluconato', 'hemihidrato', 'hiclato', 'hidrobromuro', 'hidrocloruro',
        'lactato', 'magnesica', 'magnesico', 'maleato', 'mesilato', 'micronizada', 'micronizado', 'monohidrato',
        'nitrato', 'palmitato', 'pamoato', 'potasica', 'potasico', 'propionato', 'sesquihidrato', 'sodica', 'sodico',
        'succinato', 'sulfato', 'tartrato', 'tosilato', 'trihidrato', 'valerato',
    ];

    public static function base(string $ingredient): string
    {
        $words = explode(' ', FoldedText::fold($ingredient));
        $kept = array_values(array_filter($words, fn (string $word): bool => ! in_array($word, self::FORMS, true)));

        // «clorhidrato de metformina» leaves a leading «de».
        while (($kept[0] ?? null) === 'de') {
            array_shift($kept);
        }

        // An ingredient that is only a form word keeps its name rather than vanishing.
        return $kept === [] ? FoldedText::fold($ingredient) : implode(' ', $kept);
    }
}
