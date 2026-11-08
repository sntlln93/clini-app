<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\HealthProfession;
use App\Models\Specialty;
use App\Support\FoldedText;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * A row as the registry would add it (#387): a specialty of a profession.
 *
 * @extends Factory<Specialty>
 */
class SpecialtyFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'profession' => HealthProfession::Medico,
            'name' => fake()->unique()->jobTitle(),
            'folded_name' => fn (array $attributes): string => FoldedText::fold((string) $attributes['name']),
        ];
    }
}
