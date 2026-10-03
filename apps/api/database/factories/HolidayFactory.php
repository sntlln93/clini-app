<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\Province as ProvinceSlug;
use App\Models\Holiday;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * National by default (`province_id` NULL); see `inProvince()`.
 *
 * @extends Factory<Holiday>
 */
class HolidayFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'date' => fake()->unique()->dateTimeBetween('now', '+1 year')->format('Y-m-d'),
            'name' => fake()->sentence(2),
            'province_id' => null,
        ];
    }

    public function inProvince(ProvinceSlug $province): static
    {
        return $this->state(fn (array $attributes): array => [
            'province_id' => CityFactory::provinceId($province),
        ]);
    }
}
