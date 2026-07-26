<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Membership;
use App\Models\Organization;
use App\Models\ProfessionalSpecialty;
use App\Models\Specialty;
use App\Models\UserSpecialty;
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
            'membership_id' => fn (array $attributes) => Membership::factory()->state([
                'organization_id' => $attributes['organization_id'],
            ]),
            'specialty_id' => Specialty::factory(),
        ];
    }

    /**
     * Denormalize `user_id` from the target membership and guarantee the
     * `user_specialties` row the composite FK requires, before the model
     * itself is persisted.
     */
    public function configure(): static
    {
        return $this->afterMaking(function (ProfessionalSpecialty $professionalSpecialty) {
            $membership = Membership::findOrFail($professionalSpecialty->membership_id);
            $professionalSpecialty->user_id = $membership->user_id;

            UserSpecialty::firstOrCreate([
                'user_id' => $membership->user_id,
                'specialty_id' => $professionalSpecialty->specialty_id,
            ]);
        });
    }
}
