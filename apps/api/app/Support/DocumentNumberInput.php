<?php

declare(strict_types=1);

namespace App\Support;

/**
 * A DNI as a person types it (#380, #417): with or without dots or spaces. The requests that take one validate the
 * digits left, 7 or 8 of them, as the registry takes them.
 */
final class DocumentNumberInput
{
    public const string RULE = 'regex:/^\d{7,8}$/';

    public const string MESSAGE = 'El DNI tiene que tener 7 u 8 números.';

    /**
     * The digits typed, or null when nothing was; anything that isn't a string is left for validation to reject.
     */
    public static function digits(mixed $value): mixed
    {
        if (! is_string($value)) {
            return $value;
        }

        $digits = (string) preg_replace('/[\s.]/u', '', $value);

        return $digits === '' ? null : $digits;
    }
}
