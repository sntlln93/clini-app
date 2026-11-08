<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\HealthProfession;
use App\Enums\ProfessionalLicenseStatus;
use App\Enums\Province;
use App\Models\ProfessionalLicense;
use App\Models\Specialty;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Unverified by default (the registry hasn't been asked), and in Clini.
 *
 * @extends Factory<ProfessionalLicense>
 */
class ProfessionalLicenseFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'number' => (string) fake()->unique()->numberBetween(1000, 999999),
            'province' => Province::CiudadAutonomaDeBuenosAires,
            'profession' => HealthProfession::Medico,
            'added_at' => now(),
        ];
    }

    /**
     * Only what the registry holds for the DNI: the professional hasn't added it to Clini (#387).
     */
    public function offered(): static
    {
        return $this->state(fn (): array => ['added_at' => null]);
    }

    /**
     * Backed by the registry when it was last asked, and so backing a specialty of its profession (#387).
     */
    public function verified(?string $checkedAt = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => ProfessionalLicenseStatus::Verified,
            'specialty_id' => $attributes['specialty_id'] ?? Specialty::factory()->state(['profession' => $attributes['profession']]),
            'refeps_code' => '541000000001',
            'issuer' => 'MINISTERIO DE SALUD DE LA NACION',
            'situation' => 'Habilitado',
            'checked_at' => $checkedAt ?? now(),
            'attempted_at' => $checkedAt ?? now(),
        ]);
    }
}
