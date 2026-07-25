<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Membership;
use App\Models\Organization;
use App\Models\ProfessionalService;
use App\Models\Service;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProfessionalService>
 */
class ProfessionalServiceFactory extends Factory
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
            'membership_id' => fn (array $attributes) => Membership::factory()->state([
                'organization_id' => $attributes['organization_id'],
            ]),
            'service_id' => fn (array $attributes) => Service::factory()->state([
                'organization_id' => $attributes['organization_id'],
            ]),
        ];
    }
}
