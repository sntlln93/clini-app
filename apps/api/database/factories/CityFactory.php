<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\Province as ProvinceSlug;
use App\Models\City;
use App\Models\Province;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Provinces are migration-inserted reference rows, so a city points at an
 * existing one instead of creating it.
 *
 * @extends Factory<City>
 */
class CityFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'province_id' => fn (): int => self::provinceId(fake()->randomElement(ProvinceSlug::cases())),
            'name' => fake()->unique()->city(),
        ];
    }

    public function inProvince(ProvinceSlug $province): static
    {
        return $this->state(fn (array $attributes): array => [
            'province_id' => self::provinceId($province),
        ]);
    }

    public static function provinceId(ProvinceSlug $province): int
    {
        /** @var int $id */
        $id = Province::query()->where('slug', $province->value)->valueOrFail('id');

        return $id;
    }
}
