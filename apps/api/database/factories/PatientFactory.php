<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\DocumentType;
use App\Enums\Sex;
use App\Models\Patient;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Patient>
 */
class PatientFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->safeEmail(),
            'phone' => fake()->phoneNumber(),
            'document_type' => DocumentType::Dni,
            'document_number' => fake()->unique()->numerify('########'),
            'sex' => fake()->randomElement(Sex::cases()),
            'birth_date' => fake()->date(),
            'insurance_provider_id' => null,
            'created_by' => null,
        ];
    }
}
