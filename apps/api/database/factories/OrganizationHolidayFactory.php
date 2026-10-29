<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Organization;
use App\Models\OrganizationHoliday;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OrganizationHoliday>
 */
class OrganizationHolidayFactory extends Factory
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
            // Unique by day: a unique instant can still fall on a day already taken.
            'date' => today()->addDays(fake()->unique()->numberBetween(0, 365))->toDateString(),
            'name' => fake()->sentence(2),
        ];
    }
}
