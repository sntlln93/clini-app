<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Address;
use App\Models\City;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Address>
 */
class AddressFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'addressable_type' => Organization::class,
            'addressable_id' => Organization::factory(),
            'street' => fake()->streetAddress(),
            'city_id' => City::factory(),
            'postal_code' => fake()->postcode(),
            'country' => 'Argentina',
        ];
    }

    public function withoutCity(): static
    {
        return $this->state(fn (array $attributes): array => [
            'city_id' => null,
        ]);
    }
}
