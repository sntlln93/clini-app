<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\AllergySeverity;
use App\Enums\MedicalHistoryCategory;
use App\Models\Appointment;
use App\Models\MedicalHistoryEntry;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MedicalHistoryEntry>
 */
class MedicalHistoryEntryFactory extends Factory
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
            'category' => MedicalHistoryCategory::Allergy,
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

    /**
     * Give the entry its version 1, so a factory-built entry is never empty.
     */
    public function configure(): static
    {
        return $this->afterCreating(function (MedicalHistoryEntry $entry): void {
            $allergy = $entry->category === MedicalHistoryCategory::Allergy;

            $entry->versions()->create([
                'version' => 1,
                'membership_id' => $entry->membership_id,
                'description' => $allergy ? 'Penicilina' : 'Hipertensión arterial',
                'reaction' => $allergy ? 'Urticaria' : null,
                'severity' => $allergy ? AllergySeverity::Moderate : null,
            ]);
        });
    }
}
