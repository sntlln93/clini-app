<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Appointment;
use App\Models\VitalSign;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VitalSign>
 */
class VitalSignFactory extends Factory
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
            'measured_at' => now(),
        ];
    }

    /**
     * Give the record its version 1 with a weight and a height, so a factory-built measurement is never empty.
     */
    public function configure(): static
    {
        return $this->afterCreating(function (VitalSign $vitalSign): void {
            $vitalSign->versions()->create([
                'version' => 1,
                'membership_id' => $vitalSign->membership_id,
                'weight_kg' => 70.5,
                'height_cm' => 170,
            ]);
        });
    }
}
