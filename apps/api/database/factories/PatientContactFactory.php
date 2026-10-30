<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\PatientContactType;
use App\Models\Patient;
use App\Models\PatientContact;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PatientContact>
 */
class PatientContactFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'patient_id' => Patient::factory(),
            'type' => PatientContactType::Email,
            'value' => fake()->unique()->safeEmail(),
            'label' => null,
            'position' => 0,
            'needs_confirmation' => false,
            'created_by' => null,
        ];
    }
}
