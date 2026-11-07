<?php

declare(strict_types=1);

namespace App\Casts;

use App\Support\ClinicalEncryption;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/**
 * Free clinical text, stored encrypted (#391, ADR 0036). Nothing searches, sorts or groups by it in SQL: whatever
 * compares it does so in PHP, after reading it.
 *
 * @implements CastsAttributes<string, string>
 */
final class EncryptedClinicalText implements CastsAttributes
{
    /**
     * @param  array<string, mixed>  $attributes
     */
    public function get(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        return is_string($value) ? app(ClinicalEncryption::class)->decrypt($value) : null;
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        return $value === null ? null : app(ClinicalEncryption::class)->encrypt((string) $value);
    }
}
