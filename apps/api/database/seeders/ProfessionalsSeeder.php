<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\MembershipRole;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\ProfessionalService;
use App\Models\ProfessionalSpecialty;
use App\Models\Service;
use App\Models\Specialty;
use App\Models\UserSpecialty;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Seeder;

/**
 * Literal specialty and service assignments for the organization's
 * professional memberships (created by OrganizationsSeeder). Catalog rows
 * are resolved by name — never inRandomOrder — and idempotent via
 * firstOrCreate on each table's natural key, so a repeated
 * `php artisan db:seed` never duplicates rows.
 */
class ProfessionalsSeeder extends Seeder
{
    /**
     * Deterministic pool assigned to each organization's professional
     * memberships in membership id order, cycling if there are more
     * professionals than fixtures.
     *
     * @var array<int, array{specialties: array<int, string>, service: string, duration: int, price: int}>
     */
    private const array PROFESSIONAL_FIXTURES = [
        [
            'specialties' => ['Medicina General', 'Pediatría'],
            'service' => 'Consulta',
            'duration' => 30,
            'price' => 5000,
        ],
        [
            'specialties' => ['Cardiología'],
            'service' => 'Control',
            'duration' => 20,
            'price' => 4000,
        ],
        [
            'specialties' => ['Dermatología'],
            'service' => 'Primera consulta',
            'duration' => 45,
            'price' => 6000,
        ],
    ];

    public function run(Organization $organization): void
    {
        $professionalMemberships = $this->professionalMemberships($organization);

        foreach ($professionalMemberships as $index => $membership) {
            $fixture = self::PROFESSIONAL_FIXTURES[$index % count(self::PROFESSIONAL_FIXTURES)];

            $this->assignSpecialties($organization, $membership, $fixture['specialties']);
            $this->assignService($organization, $membership, $fixture['service'], $fixture['duration'], $fixture['price']);
        }
    }

    /**
     * @return Collection<int, Membership>
     */
    private function professionalMemberships(Organization $organization): Collection
    {
        return Membership::where('organization_id', $organization->id)
            ->orderBy('id')
            ->get()
            ->filter(fn (Membership $membership): bool => in_array(MembershipRole::Professional, $membership->roles, true))
            ->values();
    }

    /**
     * @param  array<int, string>  $specialtyNames
     */
    private function assignSpecialties(Organization $organization, Membership $membership, array $specialtyNames): void
    {
        foreach ($specialtyNames as $specialtyName) {
            $specialty = Specialty::where('name', $specialtyName)->firstOrFail();

            // The composite FK on professional_specialties requires a
            // matching user_specialties row (the user's global credential)
            // before the org-level assignment can be created.
            UserSpecialty::firstOrCreate([
                'user_id' => $membership->user_id,
                'specialty_id' => $specialty->id,
            ]);

            ProfessionalSpecialty::firstOrCreate(
                ['membership_id' => $membership->id, 'specialty_id' => $specialty->id],
                ['organization_id' => $organization->id, 'user_id' => $membership->user_id],
            );
        }
    }

    private function assignService(Organization $organization, Membership $membership, string $serviceName, int $durationMinutes, int $priceCents): void
    {
        $service = Service::where('name', $serviceName)->firstOrFail();

        ProfessionalService::firstOrCreate(
            ['membership_id' => $membership->id, 'service_id' => $service->id],
            [
                'organization_id' => $organization->id,
                'duration_minutes' => $durationMinutes,
                'price_cents' => $priceCents,
                'currency' => 'ARS',
                'active' => true,
            ],
        );
    }
}
