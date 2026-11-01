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
     * Spanish accented vowels and what they match.
     */
    public const array UNACCENTED_VOWELS = ['á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u'];

    /**
     * Spanish accented letters and what they match: the same pairs go to PHP's strtr() and SQL's translate().
     */
    public const array UNACCENTED = [...self::UNACCENTED_VOWELS, 'ñ' => 'n'];

    /**
     * Lowercase, without accents and with every run of whitespace as one space.
     */
    public static function fold(string $text): string
    {
        $folded = strtr(mb_strtolower($text), self::UNACCENTED);

        return self::collapsed($folded);
    }

    /**
     * Like `fold()`, but «ñ» stays apart from «n»: for a comparison that must not find more than one that tells them
     * apart would.
     */
    public static function foldVowels(string $text): string
    {
        return self::collapsed(strtr(mb_strtolower($text), self::UNACCENTED_VOWELS));
    }

    private static function collapsed(string $text): string
    {
        return trim((string) preg_replace('/\s+/u', ' ', $text));
    }
}
