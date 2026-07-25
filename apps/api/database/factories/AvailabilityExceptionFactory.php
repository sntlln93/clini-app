<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\AvailabilityExceptionType;
use App\Models\AvailabilityException;
use App\Models\Membership;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AvailabilityException>
 */
class AvailabilityExceptionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startAt = fake()->dateTimeBetween('now', '+1 month');

        return [
            'organization_id' => Organization::factory(),
            'membership_id' => fn (array $attributes) => Membership::factory()->state([
                'organization_id' => $attributes['organization_id'],
            ]),
            'type' => fake()->randomElement(AvailabilityExceptionType::cases()),
            'start_at' => $startAt,
            'end_at' => (clone $startAt)->modify('+2 hours'),
            'reason' => fake()->sentence(),
        ];
    }
}
