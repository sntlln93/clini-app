<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ProfessionalLicenseMismatch;
use App\Enums\ProfessionalLicenseStatus;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\ProfessionalLicense;
use App\Models\ProfessionalSpecialty;
use App\Models\Specialty;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProfessionalSpecialty>
 */
class ProfessionalSpecialtyFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'membership_id' => fn (array $attributes) => Membership::factory()->state([
                'organization_id' => $attributes['organization_id'],
            ]),
            'specialty_id' => Specialty::factory(),
        ];
    }

    /**
     * Denormalize `user_id` from the target membership and give the professional the verified license that backs the
     * specialty, as the API requires to offer it (#387).
     */
    public function configure(): static
    {
        return $this->afterMaking(function (ProfessionalSpecialty $professionalSpecialty) {
            $membership = Membership::findOrFail($professionalSpecialty->membership_id);
            $professionalSpecialty->user_id = $membership->user_id;
            $specialty = Specialty::findOrFail($professionalSpecialty->specialty_id);

            $isBacked = ProfessionalLicense::query()
                ->where('user_id', $membership->user_id)
                ->where('specialty_id', $specialty->id)
                ->where('status', ProfessionalLicenseStatus::Verified)
                ->exists();

            if (! $isBacked) {
                ProfessionalLicense::factory()->verified()->create([
                    'user_id' => $membership->user_id,
                    'profession' => $specialty->profession,
                    'specialty_id' => $specialty->id,
                ]);
            }
        });
    }

    /**
     * Offered while a license backed it, which the registry no longer calls verified: the panel marks it «sin respaldo
     * de matrícula» (#387).
     */
    public function unbacked(): static
    {
        return $this->afterCreating(fn (ProfessionalSpecialty $professionalSpecialty) => ProfessionalLicense::query()
            ->where('user_id', $professionalSpecialty->user_id)
            ->where('specialty_id', $professionalSpecialty->specialty_id)
            ->update([
                'status' => ProfessionalLicenseStatus::Mismatch,
                'mismatch_reason' => ProfessionalLicenseMismatch::NotEnabled,
                'situation' => 'Suspendido',
            ]));
    }
}
