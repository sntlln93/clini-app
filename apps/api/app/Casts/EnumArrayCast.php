<?php

declare(strict_types=1);

namespace App\Casts;

use BackedEnum;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/**
 * Casts a JSON array column to an array of backed enum cases and back.
 *
 * Parametrized with the enum class, e.g.:
 * `'roles' => EnumArrayCast::class.':'.MembershipRole::class`.
 *
 * Unknown strings (e.g. a case removed from the enum after the row was
 * written) are silently discarded on read instead of throwing.
 *
 * @implements CastsAttributes<array<int, BackedEnum>, array<int, BackedEnum|string>>
 */
class EnumArrayCast implements CastsAttributes
{
    /**
     * @param  class-string<BackedEnum>  $enumClass
     */
    public function __construct(private readonly string $enumClass) {}

    /**
     * @param  array<string, mixed>  $attributes
     * @return array<int, BackedEnum>
     */
    public function get(Model $model, string $key, mixed $value, array $attributes): array
    {
        if (! is_string($value)) {
            return [];
        }

        $decoded = json_decode($value, true);

        if (! is_array($decoded)) {
            return [];
        }

        $enumClass = $this->enumClass;

        $cases = [];
        foreach ($decoded as $item) {
            $case = is_string($item) || is_int($item) ? $enumClass::tryFrom($item) : null;

            if ($case !== null) {
                $cases[] = $case;
            }
        }

        return $cases;
    }

    /**
     * @param  array<int, BackedEnum|string>|null  $value
     * @param  array<string, mixed>  $attributes
     */
    public function set(Model $model, string $key, mixed $value, array $attributes): string
    {
        $values = array_map(
            static fn (BackedEnum|string $item): string|int => $item instanceof BackedEnum ? $item->value : $item,
            $value ?? [],
        );

        return json_encode(array_values($values), JSON_THROW_ON_ERROR);
    }
}
