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

    /**
     * Written outside an appointment (#382, ADR 0037), by the professional of the given one and about its patient.
     */
    public function outsideAppointment(Appointment $attended): static
    {
        return $this->state([
            'appointment_id' => null,
            'organization_id' => $attended->organization_id,
            'patient_id' => $attended->patient_id,
            'membership_id' => $attended->membership_id,
        ]);
    }
}
