<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\HealthProfession;
use App\Models\ProfessionalLicense;
use App\Models\User;
use App\Services\Professionals\FakeProfessionalRegistry;
use App\Support\ProfessionalLicenseMatch;
use App\Support\RegistrySpecialtyCatalog;
use Illuminate\Database\Seeder;

/**
 * The seeded professionals' DNIs and licenses, verified the way the registry would (#387, ADR 0038): from the fake
 * registry's answer, which also fills the specialties catalog, so the fixture holds no hand-written specialty. The
 * answer is read straight from `FakeProfessionalRegistry`, never through the bound registry, since this seeder also
 * runs on the production image (the demo), where that is the real one. There the DNIs are left out: the daily
 * reverification would send them to the real registry. Idempotent by each license's natural key.
 */
class ProfessionalRegistrySeeder extends Seeder
{
    /**
     * The seeded professionals and the made-up DNI the fake registry answers for each.
     *
     * @var array<string, string>
     */
    public const array DOCUMENT_NUMBERS = [
        'carla.profesional@test.com' => '99000001',
        'diego.profesional@test.com' => '99000002',
    ];

    public function run(): void
    {
        $registry = new FakeProfessionalRegistry;

        foreach (self::DOCUMENT_NUMBERS as $email => $documentNumber) {
            $user = User::query()->where('email', $email)->firstOrFail();
            $professionals = $registry->lookUp($documentNumber);
            $catalog = RegistrySpecialtyCatalog::record($professionals);

            if (! app()->isProduction()) {
                $user->forceFill(['document_number' => $documentNumber])->save();
            }

            foreach ($professionals as $professional) {
                foreach ($professional->licenses as $registered) {
                    $profession = HealthProfession::fromRegistryName($registered->profession);

                    if ($profession === null || $registered->province === null) {
                        continue;
                    }

                    $license = ProfessionalLicense::query()->firstOrCreate([
                        'user_id' => $user->id,
                        'province' => $registered->province,
                        'profession' => $profession,
                        'number' => ProfessionalLicense::normalizedNumber($registered->number),
                    ]);
                    $outcome = ProfessionalLicenseMatch::outcome($license->number, $license->province, $profession, $professionals);

                    $license->forceFill([
                        'status' => $outcome->status,
                        'mismatch_reason' => $outcome->mismatchReason,
                        'refeps_code' => $outcome->refepsCode,
                        'issuer' => $outcome->license?->issuer,
                        'specialty_id' => $catalog[RegistrySpecialtyCatalog::key($profession, RegistrySpecialtyCatalog::name($profession, $registered->specialty))] ?? null,
                        'situation' => $outcome->license?->situation,
                        'checked_at' => now(),
                        'attempted_at' => now(),
                    ])->save();
                }
            }
        }
    }
}
