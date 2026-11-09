<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Money in whole cents, bounded so it never silently overflows or loses
 * precision: an amount the panel can't read exactly (JavaScript numbers are
 * exact only up to 2^53 - 1) isn't an amount. Columns holding cents are
 * bigint, so the bound is this one, not Postgres's.
 */
final class Cents
{
    /** JavaScript's `Number.MAX_SAFE_INTEGER`: about 90 trillion pesos. */
    public const int MAX_EXACT = 9_007_199_254_740_991;

    /**
     * 2^45 pesos: below it a double lies within a fifth of a cent of the
     * decimal it was parsed from, so its cents can still be told; above it
     * (a provider's JSON number of some 35 trillion pesos) they can't.
     */
    private const float MAX_FLOAT_PESOS = 35_184_372_088_832.0;

    /**
     * A decimal amount (a provider's `15000.5`, or `"15000.50"`) in cents,
     * worked out on its digits, never by multiplying a float; null when it
     * isn't an amount with at most two decimals, or is beyond `MAX_EXACT`
     * (or, as a float, beyond what a float tells to the cent).
     */
    public static function fromAmount(mixed $amount): ?int
    {
        if (is_float($amount)) {
            if (! is_finite($amount) || abs($amount) >= self::MAX_FLOAT_PESOS) {
                return null;
            }

            $amount = number_format($amount, 2, '.', '');
        }

        if (is_int($amount)) {
            $amount = (string) $amount;
        }

        if (! is_string($amount) || preg_match('/^(-?)0*(\d{1,16})(?:\.(\d{1,2}))?$/', $amount, $parts) !== 1) {
            return null;
        }

        $fraction = (int) str_pad($parts[3] ?? '', 2, '0');
        $whole = (int) $parts[2];

        // Compared before multiplying, so no product ever overflows.
        if ($whole > intdiv(self::MAX_EXACT - $fraction, 100)) {
            return null;
        }

        $cents = $whole * 100 + $fraction;

        return $parts[1] === '-' ? -$cents : $cents;
    }
}
