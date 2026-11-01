<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\HealthProfession;
use App\Enums\ProfessionalLicenseStatus;
use App\Enums\Province;
use App\Models\ProfessionalLicense;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Unverified by default: the registry hasn't been asked.
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
        ];
    }

    /**
     * Backed by the registry when it was last asked.
     */
    public function verified(?string $checkedAt = null): static
    {
        return $this->state(fn (): array => [
            'status' => ProfessionalLicenseStatus::Verified,
            'refeps_code' => '541000000001',
            'issuer' => 'MINISTERIO DE SALUD DE LA NACION',
            'situation' => 'Habilitado',
            'checked_at' => $checkedAt ?? now(),
            'attempted_at' => $checkedAt ?? now(),
        ]);
    }
}
