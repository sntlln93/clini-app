<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Appointment;
use App\Models\ClinicalNote;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ClinicalNote>
 */
class ClinicalNoteFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'appointment_id' => Appointment::factory(),
            'organization_id' => fn (array $attributes) => Appointment::findOrFail($attributes['appointment_id'])->organization_id,
            'membership_id' => fn (array $attributes) => Appointment::findOrFail($attributes['appointment_id'])->membership_id,
            'body' => fake()->paragraph(),
        ];
    }
}
