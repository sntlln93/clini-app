<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Appointment;
use App\Models\Prescription;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Prescription>
 */
class PrescriptionFactory extends Factory
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
            'diagnosis' => fake()->sentence(),
            'issued_at' => now(),
        ];
    }

    /**
     * Attach one item, so a factory-built prescription is never empty.
     */
    public function configure(): static
    {
        return $this->afterCreating(function (Prescription $prescription): void {
            $prescription->items()->create([
                'position' => 0,
                'medication' => 'Amoxicilina',
                'presentation' => 'Comprimidos 500 mg',
                'dosage' => '1 cada 8 h por 7 días',
                'quantity' => 1,
            ]);
        });
    }
}
