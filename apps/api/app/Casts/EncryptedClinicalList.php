<?php

declare(strict_types=1);

namespace App\Casts;

use App\Support\ClinicalEncryption;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/**
 * A list of clinical strings, stored encrypted as one JSON text (#391, ADR 0036): the substances of a prescribed
 * product, which the allergy warning compares in PHP.
 *
 * @implements CastsAttributes<list<string>, list<string>>
 */
final class EncryptedClinicalList implements CastsAttributes
{
    /**
     * @param  array<string, mixed>  $attributes
     * @return list<string>|null
     */
    public function get(Model $model, string $key, mixed $value, array $attributes): ?array
    {
        if (! is_string($value)) {
            return null;
        }

        $decoded = json_decode(app(ClinicalEncryption::class)->decrypt($value), true, flags: JSON_THROW_ON_ERROR);

        return is_array($decoded) ? array_values(array_filter($decoded, is_string(...))) : null;
    }

    /**
     * @param  list<string>|null  $value
     * @param  array<string, mixed>  $attributes
     */
    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        return $value === null
            ? null
            : app(ClinicalEncryption::class)->encrypt(json_encode($value, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE));
    }
}
