<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Membership;
use App\Models\Organization;
use App\Models\ProfessionalSpecialty;
use App\Models\Specialty;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProfessionalSpecialty>
 */
class ProfessionalSpecialtyFactory extends Factory
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
            'specialty_id' => Specialty::factory(),
        ];
    }
}
