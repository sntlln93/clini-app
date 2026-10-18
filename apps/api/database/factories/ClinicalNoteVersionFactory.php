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
            'version' => 1,
            'membership_id' => fn (array $attributes) => ClinicalNote::findOrFail($attributes['clinical_note_id'])->membership_id,
            'body' => fake()->paragraph(),
        ];
    }
}
