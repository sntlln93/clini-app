<?php

declare(strict_types=1);

namespace App\Support;

use App\Data\Medications\MedicationCompositionData;
use App\Data\Medications\MedicationIngredientData;

/**
 * The substances a product's drug text names (#377, ADR 0031). The national medication search joins them with «+»,
 * abbreviates some («pseudoef.», «vit.b1 b6 b12»), writes acids and salts inverted («clavulánico,ác.»,
 * «metformina,clorh.») and closes long associations with «asoc.», dropping the rest («ergotamina+cafeína+asoc.» is
 * Migral, whose dipyrone is lost). Each substance is written out in lowercase, with the accents the source gives it,
 * and without its salt or hydrate: an allergy to dipyrone is to «dipirona sódica» too. The allergy warning folds it
 * (`FoldedText`) to compare it; the panel shows it as is. Only the abbreviations listed here are expanded; an unknown
 * one stays as written, and a cut list is marked incomplete, never completed by guessing. Full resolution by SNOMED
 * is #376.
 */
class MedicationComposition
{
    /**
     * The source's own abbreviations of a whole substance, folded, and what they stand for.
     */
    public const array ABBREVIATIONS = [
        'amlodip.' => 'amlodipina',
        'betamet.' => 'betametasona',
        'carbohid.' => 'carbohidratos',
        'centella as.' => 'centella asiática',
        'clorfeniram.' => 'clorfeniramina',
        'colag.' => 'colágeno',
        'gentamic.' => 'gentamicina',
        'hidrocloroti.' => 'hidroclorotiazida',
        'pseudoef.' => 'pseudoefedrina',
        'serenoa rep.' => 'serenoa repens',
    ];

    /**
     * What closes a list the source cut short: «and associated substances».
     */
    private const array ASSOCIATION = ['asoc.', 'asoc'];

    /**
     * Elements the source writes first in an inverted salt, folded: «sodio,bicarbonato» is «bicarbonato de sodio», a
     * substance of its own, unlike «metformina,clorh.», which is metformin.
     */
    private const array CATIONS = [
        'aluminio', 'bismuto', 'calcio', 'hierro', 'litio', 'magnesio', 'metilo', 'potasio', 'sodio', 'titanio', 'zinc',
    ];

    /**
     * Salts, hydrates and the like, folded and abbreviated as the source writes them, before or after the substance.
     */
    private const array FORMS = [
        'acetato', 'anhidra', 'anhidro', 'base', 'benzoato', 'besilato', 'bitartrato', 'bromhidrato', 'butirato',
        'calcica', 'calcico', 'citrato', 'clor.', 'clorh.', 'clorhidrato', 'dihidrato', 'dipropionato', 'disod.',
        'disodica', 'disodico', 'estearato', 'fosfato', 'fumarato', 'furoato', 'gluconato', 'hemihidrato', 'hiclato',
        'hidrobromuro', 'hidrocloruro', 'lactato', 'magnesica', 'magnesico', 'maleato', 'mesilato', 'micronizada',
        'micronizado', 'monohidrato', 'nitrato', 'palmitato', 'pamoato', 'potasica', 'potasico', 'propionato',
        'sesquihidrato', 'sod.', 'sodica', 'sodico', 'succinato', 'sulfato', 'tartrato', 'tosilato', 'trihidrato',
        'valerato',
    ];

    public static function of(?string $drug): MedicationCompositionData
    {
        $ingredients = [];
        $incomplete = false;

        foreach (explode('+', $drug ?? '') as $piece) {
            $name = trim($piece);

            if ($name === '') {
                continue;
            }

            if (in_array(FoldedText::fold($name), self::ASSOCIATION, true)) {
                $incomplete = true;

                continue;
            }

            foreach (self::substances($name) as $substance) {
                $ingredients[] = new MedicationIngredientData($name, $substance);
            }
        }

        return new MedicationCompositionData($ingredients, $incomplete);
    }

    /**
     * The substances one piece of the drug text names: one, except for a list of vitamins («vit.b1 b6 b12»).
     *
     * @return list<string>
     */
    public static function substances(string $name): array
    {
        // «betametasona (acet.y fosf.disod)»: the salts it comes as, in brackets the source doesn't always close.
        $text = trim((string) preg_replace('/\s*\(.*$/u', '', self::lowercase($name)));

        if (preg_match('/^(.+?)\s*,\s*[aá]c\.?$/u', $text, $acid) === 1 || preg_match('/^[aá]c\.\s*(.+)$/u', $text, $acid) === 1) {
            return ['ácido '.trim($acid[1])];
        }

        if (str_contains($text, ',')) {
            [$first, $second] = array_map(trim(...), explode(',', $text, 2));

            if (in_array(FoldedText::fold($first), self::CATIONS, true) && $second !== '') {
                return ["{$second} de {$first}"];
            }

            // «metformina,clorh.», «hioscina,n-butilbr.», «bacillus clausii,esporas»: the substance comes first.
            $text = $first;
        }

        $text = self::ABBREVIATIONS[FoldedText::fold($text)] ?? $text;

        if (preg_match('/^vit\.\s*(.+)$/u', $text, $vitamins) === 1) {
            $letters = explode(' ', $vitamins[1]);

            // «vit.b1 b6 b12» names three vitamins, each one an allergy can be to.
            return count($letters) > 1 && array_all($letters, fn (string $letter): bool => preg_match('/^[a-z]\d*$/u', $letter) === 1)
                ? array_map(fn (string $letter): string => "vitamina {$letter}", $letters)
                : [self::withoutForm("vitamina {$vitamins[1]}")];
        }

        return [self::withoutForm($text)];
    }

    /**
     * Lowercase, accents kept, with every run of whitespace as one space.
     */
    private static function lowercase(string $text): string
    {
        return trim((string) preg_replace('/\s+/u', ' ', mb_strtolower($text)));
    }

    private static function withoutForm(string $text): string
    {
        $kept = array_values(array_filter(
            explode(' ', $text),
            fn (string $word): bool => ! in_array(FoldedText::fold($word), self::FORMS, true),
        ));

        // «clorhidrato de metformina» leaves a leading «de».
        while (($kept[0] ?? null) === 'de') {
            array_shift($kept);
        }

        // A substance that is only a form word keeps its name rather than vanishing.
        return $kept === [] ? $text : implode(' ', $kept);
    }
}
