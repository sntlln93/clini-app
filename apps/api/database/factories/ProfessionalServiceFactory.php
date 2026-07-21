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
            'membership_id' => Membership::factory(),
            'service_id' => Service::factory(),
        ];
    }
}
