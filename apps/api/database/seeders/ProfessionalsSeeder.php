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
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Seeder;

/**
 * Literal specialty and service assignments for the organization's
 * professional memberships (created by OrganizationsSeeder). Each one
 * offers every specialty its verified licenses back
 * (ProfessionalRegistrySeeder, #387); services are resolved by name —
 * never inRandomOrder — and every row is idempotent via firstOrCreate on
 * its table's natural key, so a repeated `php artisan db:seed` never
 * duplicates rows.
 */
class ProfessionalsSeeder extends Seeder
{
    /**
     * Deterministic pool assigned to each organization's professional
     * memberships in membership id order, cycling if there are more
     * professionals than fixtures.
     *
     * @var array<int, array{service: string, duration: int, price: int}>
     */
    private const array PROFESSIONAL_FIXTURES = [
        [
            'service' => 'Consulta',
            'duration' => 30,
            'price' => 5000,
        ],
        [
            'service' => 'Control',
            'duration' => 20,
            'price' => 4000,
        ],
        [
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

            $this->assignSpecialties($organization, $membership);
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

    private function assignSpecialties(Organization $organization, Membership $membership): void
    {
        $specialties = Specialty::query()->backedFor($membership->user_id)->orderBy('id')->get();

        foreach ($specialties as $specialty) {
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
