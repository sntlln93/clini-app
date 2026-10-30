<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Spanish text compared without case or accents: the ICD-10 search (#324) and the allergy warning when indicating
 * medication (#362) both match what was typed against free text this way.
 */
class FoldedText
{
    /**
     * Spanish accented letters and what they match: the same pairs go to PHP's strtr() and SQL's translate().
     */
    public const array UNACCENTED = ['á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u', 'ñ' => 'n'];

    /**
     * Lowercase, without accents and with every run of whitespace as one space.
     */
    public static function fold(string $text): string
    {
        $folded = strtr(mb_strtolower($text), self::UNACCENTED);

        return trim((string) preg_replace('/\s+/u', ' ', $folded));
    }
}
