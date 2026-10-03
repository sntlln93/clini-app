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
            'date' => fake()->unique()->dateTimeBetween('now', '+1 year')->format('Y-m-d'),
            'name' => fake()->sentence(2),
        ];
    }
}
