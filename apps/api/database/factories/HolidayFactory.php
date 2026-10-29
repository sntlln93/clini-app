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
            // Unique by day: a unique instant can still fall on a day already taken.
            'date' => today()->addDays(fake()->unique()->numberBetween(0, 365))->toDateString(),
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
