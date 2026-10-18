<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Icd10Code;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Icd10Code>
 */
class Icd10CodeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            // A letter, two digits and a subcategory, like J02.9.
            'code' => strtoupper(fake()->unique()->bothify('?##.#')),
            'description' => fake()->sentence(4),
        ];
    }
}
