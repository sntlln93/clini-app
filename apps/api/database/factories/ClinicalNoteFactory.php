<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Appointment;
use App\Models\ClinicalNote;
use App\Models\ClinicalNoteVersion;
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
            'patient_id' => fn (array $attributes) => Appointment::findOrFail($attributes['appointment_id'])->patient_id,
            'membership_id' => fn (array $attributes) => Appointment::findOrFail($attributes['appointment_id'])->membership_id,
        ];
    }

    /**
     * Version 1 with the given text, instead of a random one.
     */
    public function withBody(string $body): static
    {
        return $this->has(ClinicalNoteVersion::factory()->state(['body' => $body]), 'versions');
    }

    /**
     * Give the note its version 1, so a factory-built note is never empty.
     * `withBody()` creates it first, as a child of the note.
     */
    public function configure(): static
    {
        return $this->afterCreating(function (ClinicalNote $clinicalNote): void {
            if (! $clinicalNote->versions()->exists()) {
                $clinicalNote->versions()->create([
                    'version' => 1,
                    'membership_id' => $clinicalNote->membership_id,
                    'body' => fake()->paragraph(),
                ]);
            }
        });
    }
}
