<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Address;
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
            'city' => fake()->city(),
            'state' => fake()->state(),
            'postal_code' => fake()->postcode(),
            'country' => 'Argentina',
        ];
    }
}
