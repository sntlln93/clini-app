<?php

declare(strict_types=1);

namespace App\Support;

/** Spanish text compared without case or accents. */
class FoldedText
{
    public const array UNACCENTED_VOWELS = ['á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u'];

    /** The same pairs go to PHP's strtr() and SQL's translate(). */
    public const array UNACCENTED = [...self::UNACCENTED_VOWELS, 'ñ' => 'n'];

    public static function fold(string $text): string
    {
        $folded = strtr(mb_strtolower($text), self::UNACCENTED);

        return self::collapsed($folded);
    }

    /** Like `fold()`, but «ñ» stays apart from «n», for a comparison that must not over-match. */
    public static function foldVowels(string $text): string
    {
        return self::collapsed(strtr(mb_strtolower($text), self::UNACCENTED_VOWELS));
    }

    private static function collapsed(string $text): string
    {
        return trim((string) preg_replace('/\s+/u', ' ', $text));
    }
}
