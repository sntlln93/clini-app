<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\HolidaySource;
use App\Models\Holiday;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
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
            'organization_id' => Organization::factory(),
            'date' => fake()->unique()->dateTimeBetween('now', '+1 year')->format('Y-m-d'),
            'name' => fake()->sentence(2),
            'source' => HolidaySource::Auto,
        ];
    }

    public function manual(): static
    {
        return $this->state(fn (array $attributes): array => [
            'source' => HolidaySource::Manual,
        ]);
    }
}
