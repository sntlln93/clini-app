<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\InsuranceProvider;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InsuranceProvider>
 */
class InsuranceProviderFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->company().' Salud',
        ];
    }
}
