<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\DocumentType;
use App\Enums\Sex;
use App\Models\InsuranceProvider;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Patient;
use Illuminate\Database\Seeder;

/**
 * Literal patient fixtures attached to the target organization through the
 * organization_patient pivot. Resolved via firstOrCreate on the
 * (document_type, document_number) natural key, matching
 * App\Actions\Patients\RegisterPatientAction's global find-or-create
 * semantics.
 *
 * One fixture patient (document 30111222) is listed under both
 * organizations on purpose: DatabaseSeeder calls this seeder once per
 * organization, so the second call finds the row the first call created
 * and only attaches the pivot — the dedupe case the Step 2 acceptance
 * criteria call for.
 *
 * Patient has no model events today; DatabaseSeeder's WithoutModelEvents
 * is therefore a no-op here, not a behavior change.
 */
class PatientsSeeder extends Seeder
{
    /**
     * @var array<int, array{name: string, document_type: DocumentType, document_number: string, email: string|null, phone: string|null, sex: Sex, birth_date: string, insurance_provider: string|null, organizations: array<int, string>}>
     */
    private const array PATIENT_FIXTURES = [
        [
            'name' => 'Lucía Fernández',
            'document_type' => DocumentType::Dni,
            'document_number' => '30111222',
            'email' => 'lucia.fernandez@example.com',
            'phone' => '+54 9 11 4000-0001',
            'sex' => Sex::F,
            'birth_date' => '1990-03-14',
            'insurance_provider' => 'OSDE',
            'organizations' => [OrganizationsSeeder::ORGANIZATION_A_SLUG, OrganizationsSeeder::ORGANIZATION_B_SLUG],
        ],
        [
            'name' => 'Martín Gómez',
            'document_type' => DocumentType::Dni,
            'document_number' => '28555666',
            'email' => 'martin.gomez@example.com',
            'phone' => '+54 9 11 4000-0002',
            'sex' => Sex::M,
            'birth_date' => '1985-07-22',
            'insurance_provider' => null,
            'organizations' => [OrganizationsSeeder::ORGANIZATION_A_SLUG],
        ],
        [
            'name' => 'Rocío Álvarez',
            'document_type' => DocumentType::Dni,
            'document_number' => '32777888',
            'email' => 'rocio.alvarez@example.com',
            'phone' => '+54 9 11 4000-0003',
            'sex' => Sex::F,
            'birth_date' => '1994-11-02',
            'insurance_provider' => 'Swiss Medical',
            'organizations' => [OrganizationsSeeder::ORGANIZATION_A_SLUG],
        ],
        [
            'name' => 'Franco Torres',
            'document_type' => DocumentType::Passport,
            'document_number' => 'AAB123456',
            'email' => null,
            'phone' => '+54 9 351 400-0004',
            'sex' => Sex::M,
            'birth_date' => '1978-01-30',
            'insurance_provider' => null,
            'organizations' => [OrganizationsSeeder::ORGANIZATION_B_SLUG],
        ],
        [
            'name' => 'Valentina Suárez',
            'document_type' => DocumentType::Dni,
            'document_number' => '35999000',
            'email' => 'valentina.suarez@example.com',
            'phone' => '+54 9 351 400-0005',
            'sex' => Sex::F,
            'birth_date' => '2001-05-18',
            'insurance_provider' => 'Galeno',
            'organizations' => [OrganizationsSeeder::ORGANIZATION_B_SLUG],
        ],
    ];

    public function run(Organization $organization): void
    {
        $creatorId = Membership::where('organization_id', $organization->id)
            ->orderBy('id')
            ->value('user_id');

        foreach (self::PATIENT_FIXTURES as $fixture) {
            if (! in_array($organization->slug, $fixture['organizations'], true)) {
                continue;
            }

            $insuranceProviderId = $fixture['insurance_provider'] !== null
                ? InsuranceProvider::where('name', $fixture['insurance_provider'])->firstOrFail()->id
                : null;

            $patient = Patient::firstOrCreate(
                [
                    'document_type' => $fixture['document_type'],
                    'document_number' => $fixture['document_number'],
                ],
                [
                    'name' => $fixture['name'],
                    'email' => $fixture['email'],
                    'phone' => $fixture['phone'],
                    'sex' => $fixture['sex'],
                    'birth_date' => $fixture['birth_date'],
                    'insurance_provider_id' => $insuranceProviderId,
                    'created_by' => $creatorId,
                ],
            );

            $organization->patients()->syncWithoutDetaching([$patient->id]);
        }
    }
}
