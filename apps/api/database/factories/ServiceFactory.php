<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Organization;
use App\Models\Service;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Service>
 */
class ServiceFactory extends Factory
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
            'name' => fake()->unique()->words(3, true),
            'duration_minutes' => fake()->randomElement([15, 20, 30, 45, 60]),
            'price_cents' => fake()->numberBetween(1000, 50000),
            'currency' => 'ARS',
            'active' => true,
        ];
    }
}
