<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\DocumentType;
use App\Enums\PatientContactType;
use App\Enums\Sex;
use App\Models\InsuranceProvider;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Patient;
use App\Models\PatientContact;
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
     * @var array<int, array{name: string, document_type: DocumentType, document_number: string, contacts: list<array{type: PatientContactType, value: string, label: string|null}>, sex: Sex, birth_date: string, insurance_provider: string|null, insurance_member_number: string|null, organizations: array<int, string>}>
     */
    private const array PATIENT_FIXTURES = [
        [
            'name' => 'Lucía Fernández',
            'document_type' => DocumentType::Dni,
            'document_number' => '30111222',
            'contacts' => [
                ['type' => PatientContactType::Email, 'value' => 'lucia.fernandez@example.com', 'label' => null],
                ['type' => PatientContactType::Whatsapp, 'value' => '+5491140000001', 'label' => null],
                ['type' => PatientContactType::Phone, 'value' => '+541140000011', 'label' => 'trabajo'],
            ],
            'sex' => Sex::F,
            'birth_date' => '1990-03-14',
            'insurance_provider' => 'OSDE',
            'insurance_member_number' => '61234567801',
            'organizations' => [OrganizationsSeeder::ORGANIZATION_A_SLUG, OrganizationsSeeder::ORGANIZATION_B_SLUG],
        ],
        [
            'name' => 'Martín Gómez',
            'document_type' => DocumentType::Dni,
            'document_number' => '28555666',
            'contacts' => [
                ['type' => PatientContactType::Email, 'value' => 'martin.gomez@example.com', 'label' => null],
                ['type' => PatientContactType::Phone, 'value' => '+5491140000002', 'label' => null],
            ],
            'sex' => Sex::M,
            'birth_date' => '1985-07-22',
            'insurance_provider' => null,
            'insurance_member_number' => null,
            'organizations' => [OrganizationsSeeder::ORGANIZATION_A_SLUG],
        ],
        [
            'name' => 'Rocío Álvarez',
            'document_type' => DocumentType::Dni,
            'document_number' => '32777888',
            'contacts' => [
                ['type' => PatientContactType::Email, 'value' => 'rocio.alvarez@example.com', 'label' => null],
                ['type' => PatientContactType::Phone, 'value' => '+5491140000003', 'label' => null],
            ],
            'sex' => Sex::F,
            'birth_date' => '1994-11-02',
            'insurance_provider' => 'Swiss Medical',
            'insurance_member_number' => '80002456712',
            'organizations' => [OrganizationsSeeder::ORGANIZATION_A_SLUG],
        ],
        [
            'name' => 'Franco Torres',
            'document_type' => DocumentType::Passport,
            'document_number' => 'AAB123456',
            'contacts' => [
                ['type' => PatientContactType::Phone, 'value' => '+5493514000004', 'label' => null],
            ],
            'sex' => Sex::M,
            'birth_date' => '1978-01-30',
            'insurance_provider' => null,
            'insurance_member_number' => null,
            'organizations' => [OrganizationsSeeder::ORGANIZATION_B_SLUG],
        ],
        [
            'name' => 'Valentina Suárez',
            'document_type' => DocumentType::Dni,
            'document_number' => '35999000',
            'contacts' => [
                ['type' => PatientContactType::Email, 'value' => 'valentina.suarez@example.com', 'label' => null],
                ['type' => PatientContactType::Phone, 'value' => '+5493514000005', 'label' => null],
            ],
            'sex' => Sex::F,
            'birth_date' => '2001-05-18',
            'insurance_provider' => 'Galeno',
            'insurance_member_number' => '4471230900',
            'organizations' => [OrganizationsSeeder::ORGANIZATION_B_SLUG],
        ],
    ];

    /**
     * First names for the volume block, combined by index with
     * VOLUME_LAST_NAMES. Only seeded into OrganizationsSeeder::ORGANIZATION_A_SLUG,
     * so GET /api/v1/patients has a second page to exercise.
     *
     * @var array<int, string>
     */
    private const array VOLUME_FIRST_NAMES = [
        'Sofía', 'Mateo', 'Camila', 'Lucas', 'Valeria',
        'Nicolás', 'Julieta', 'Tomás', 'Agustina', 'Emiliano',
        'Micaela', 'Santiago', 'Florencia', 'Joaquín', 'Antonella',
        'Ignacio', 'Milagros', 'Federico', 'Carolina', 'Maximiliano',
    ];

    /**
     * @var array<int, string>
     */
    private const array VOLUME_LAST_NAMES = [
        'Rojas', 'Medina', 'Herrera', 'Castro', 'Ortiz',
        'Silva', 'Molina', 'Ramos', 'Núñez', 'Vega',
        'Aguirre', 'Peralta', 'Domínguez', 'Cabrera', 'Ríos',
        'Benítez', 'Flores', 'Acosta', 'Paz', 'Correa',
    ];

    /**
     * Distinct from every PATIENT_FIXTURES document number.
     *
     * @var array<int, string>
     */
    private const array VOLUME_DOCUMENT_NUMBERS = [
        '40000001', '40000002', '40000003', '40000004', '40000005',
        '40000006', '40000007', '40000008', '40000009', '40000010',
        '40000011', '40000012', '40000013', '40000014', '40000015',
        '40000016', '40000017', '40000018', '40000019', '40000020',
    ];

    /**
     * Cycled by index — no randomness.
     *
     * @var array<int, Sex>
     */
    private const array VOLUME_SEXES = [Sex::F, Sex::M];

    /**
     * @var array<int, string>
     */
    private const array VOLUME_BIRTH_DATES = [
        '1975-02-10', '1980-05-22', '1983-09-14', '1988-12-01', '1991-03-27',
        '1993-07-19', '1996-01-05', '1998-10-30', '2000-04-16', '2002-08-08',
        '1979-11-23', '1984-06-12', '1987-02-28', '1990-09-09', '1994-12-17',
        '1997-05-04', '1999-03-21', '2001-07-06', '2003-10-13', '2004-01-29',
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
                    'sex' => $fixture['sex'],
                    'birth_date' => $fixture['birth_date'],
                    'insurance_provider_id' => $insuranceProviderId,
                    'insurance_member_number' => $fixture['insurance_member_number'],
                    'created_by' => $creatorId,
                ],
            );

            $this->seedContacts($patient, $fixture['contacts'], $creatorId);
            $organization->patients()->syncWithoutDetaching([$patient->id]);
        }

        $this->seedVolumePatients($organization, $creatorId);
    }

    /**
     * 20 volume patients, literal and deterministic, so paginated listings
     * (default per_page 15) always have a second page in this organization.
     */
    private function seedVolumePatients(Organization $organization, mixed $creatorId): void
    {
        if ($organization->slug !== OrganizationsSeeder::ORGANIZATION_A_SLUG) {
            return;
        }

        foreach (self::VOLUME_FIRST_NAMES as $index => $firstName) {
            $sequence = str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT);

            $patient = Patient::firstOrCreate(
                [
                    'document_type' => DocumentType::Dni,
                    'document_number' => self::VOLUME_DOCUMENT_NUMBERS[$index],
                ],
                [
                    'name' => $firstName.' '.self::VOLUME_LAST_NAMES[$index],
                    'sex' => self::VOLUME_SEXES[$index % count(self::VOLUME_SEXES)],
                    'birth_date' => self::VOLUME_BIRTH_DATES[$index],
                    'insurance_provider_id' => null,
                    'insurance_member_number' => null,
                    'created_by' => $creatorId,
                ],
            );

            $this->seedContacts($patient, [['type' => PatientContactType::Email, 'value' => "paciente{$sequence}@example.com", 'label' => null]], $creatorId);
            $organization->patients()->syncWithoutDetaching([$patient->id]);
        }
    }

    /**
     * Already normalized (E.164, lowercase), as the API stores them (#365).
     *
     * @param  list<array{type: PatientContactType, value: string, label: string|null}>  $contacts
     */
    private function seedContacts(Patient $patient, array $contacts, mixed $creatorId): void
    {
        foreach ($contacts as $position => $contact) {
            PatientContact::firstOrCreate(
                ['patient_id' => $patient->id, 'type' => $contact['type'], 'value' => $contact['value']],
                ['label' => $contact['label'], 'position' => $position, 'created_by' => $creatorId],
            );
        }
    }
}
