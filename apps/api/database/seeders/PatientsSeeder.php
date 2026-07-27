<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\InsuranceProvider;
use App\Models\Organization;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Patient fixtures, dev/test only, attached to the target organization
 * through the `organization_patient` pivot so they show up in the panel's
 * patients listing.
 */
class PatientsSeeder extends Seeder
{
    private const int PATIENT_COUNT = 18;

    public function run(Organization $organization): void
    {
        $owner = User::where('name', 'Test User')->firstOrFail();
        $insuranceProviderIds = InsuranceProvider::pluck('id');

        for ($i = 0; $i < self::PATIENT_COUNT; $i++) {
            $insuranceProviderId = $i % 2 === 0 && $insuranceProviderIds->isNotEmpty()
                ? $insuranceProviderIds->random()
                : null;

            $patient = Patient::factory()->create([
                'insurance_provider_id' => $insuranceProviderId,
                'created_by' => $owner->id,
            ]);

            $organization->patients()->attach($patient->id);
        }
    }
}
