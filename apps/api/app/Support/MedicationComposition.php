<?php

declare(strict_types=1);

namespace App\Support;

use App\Data\Medications\MedicationCompositionData;
use App\Data\Medications\MedicationIngredientData;

/** Salts are dropped because an allergy to «dipirona» is to «dipirona sódica» too (ADR 0031). */
class MedicationComposition
{
    /** The source's abbreviations of a whole substance, keyed folded. */
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

    /** What closes a list the source cut short. */
    private const array ASSOCIATION = ['asoc.', 'asoc'];

    /** Folded: «sodio,bicarbonato» is a substance of its own, unlike «metformina,clorh.», which is metformin. */
    private const array CATIONS = [
        'aluminio', 'bismuto', 'calcio', 'hierro', 'litio', 'magnesio', 'metilo', 'potasio', 'sodio', 'titanio', 'zinc',
    ];

    /** Folded and abbreviated as the source writes them, before or after the substance. */
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

    /** Unlike `FoldedText::fold()`, accents are kept. */
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
