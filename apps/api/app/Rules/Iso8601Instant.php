<?php

declare(strict_types=1);

namespace App\Rules;

use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Throwable;

/**
 * Accepts only an ISO 8601 date-time with an explicit offset (`Z` or
 * `±HH:MM`), e.g. `2026-10-12T12:00:00.000Z`. The `date` rule also accepts
 * `2026-10-12T09:00`, which Carbon then reads as UTC, so a client sending its
 * local wall clock saved an instant shifted by its offset (#265).
 */
final readonly class Iso8601Instant implements ValidationRule
{
    private const string PATTERN = '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?(Z|[+-]\d{2}:\d{2})$/';

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || preg_match(self::PATTERN, $value) !== 1 || ! $this->isRealMoment($value)) {
            $fail('El campo :attribute debe ser una fecha y hora con zona horaria (ISO 8601).');
        }
    }

    // The pattern lets through impossible moments such as 2026-02-30T25:00Z.
    private function isRealMoment(string $value): bool
    {
        try {
            $parsed = CarbonImmutable::parse($value);
        } catch (Throwable) {
            return false;
        }

        return $parsed->format('Y-m-d\TH:i') === substr($value, 0, 16);
    }
}
