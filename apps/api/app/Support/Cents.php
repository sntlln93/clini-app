<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Money in whole cents, bounded so it never silently overflows or loses
 * precision: an amount the panel can't read exactly (JavaScript numbers are
 * exact only up to 2^53 - 1) isn't an amount.
 * Columns holding cents are bigint, so the bound is this one, not Postgres's.
 */
final class Cents
{
    /** JavaScript's `Number.MAX_SAFE_INTEGER`: about 90 trillion pesos. */
    public const int MAX_EXACT = 9_007_199_254_740_991;

    /**
     * A decimal amount (a provider's `15000.5`, or `"15000.50"`) in cents;
     * null when it isn't a number or is beyond `MAX_EXACT` either way.
     */
    public static function fromAmount(mixed $amount): ?int
    {
        if (! is_int($amount) && ! is_float($amount) && ! (is_string($amount) && is_numeric($amount))) {
            return null;
        }

        $cents = round((float) $amount * 100);

        return is_finite($cents) && abs($cents) <= self::MAX_EXACT ? (int) $cents : null;
    }
}
