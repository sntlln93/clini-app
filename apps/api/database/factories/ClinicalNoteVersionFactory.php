<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\ClinicalNote;
use App\Models\ClinicalNoteVersion;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ClinicalNoteVersion>
 */
class ClinicalNoteVersionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'clinical_note_id' => ClinicalNote::factory(),
            // The note factory already gave the note its version 1.
            'version' => fn (array $attributes) => ((int) ClinicalNoteVersion::where('clinical_note_id', $attributes['clinical_note_id'])->max('version')) + 1,
            'membership_id' => fn (array $attributes) => ClinicalNote::findOrFail($attributes['clinical_note_id'])->membership_id,
            'body' => fake()->paragraph(),
        ];
    }
}
