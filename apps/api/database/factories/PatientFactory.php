<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\DocumentType;
use App\Enums\PatientContactType;
use App\Enums\Sex;
use App\Models\Patient;
use App\Models\PatientContact;
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
            'document_type' => DocumentType::Dni,
            'document_number' => fake()->unique()->numerify('########'),
            'sex' => fake()->randomElement(Sex::cases()),
            'birth_date' => fake()->date(),
            'insurance_provider_id' => null,
            'insurance_member_number' => null,
            'created_by' => null,
        ];
    }

    public function withEmail(string $email, bool $needsConfirmation = false): static
    {
        return $this->withContact(PatientContactType::Email, $email, $needsConfirmation);
    }

    /**
     * `$value` goes as given: pass it already normalized (E.164 for a phone).
     */
    public function withContact(PatientContactType $type, string $value, bool $needsConfirmation = false): static
    {
        return $this->has(
            PatientContact::factory()->state(fn (array $attributes, Patient $patient): array => [
                'type' => $type,
                'value' => $value,
                'needs_confirmation' => $needsConfirmation,
                'position' => $patient->contacts()->count(),
            ]),
            'contacts',
        );
    }
}
