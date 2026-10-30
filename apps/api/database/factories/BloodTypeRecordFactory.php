<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\BloodType;
use App\Models\Appointment;
use App\Models\BloodTypeRecord;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BloodTypeRecord>
 */
class BloodTypeRecordFactory extends Factory
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
            'patient_id' => fn (array $attributes) => Appointment::findOrFail($attributes['appointment_id'])->patient_id,
            'blood_type' => BloodType::OPositive,
        ];
    }
}
