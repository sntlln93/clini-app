<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\ProfessionalLicense;
use App\Models\User;
use App\Services\Professionals\FakeProfessionalRegistry;
use App\Support\ProfessionalLicenseSync;
use App\Support\RegistrySpecialtyCatalog;
use Illuminate\Database\Seeder;

/**
 * The seeded professionals' DNIs and licenses, verified and added to Clini the way the registry and they would (#387,
 * ADR 0038): from the fake registry's answer, which also fills the specialties catalog, so the fixture holds no
 * hand-written specialty. The answer is read straight from `FakeProfessionalRegistry`, never through the bound
 * registry, since this seeder also runs on the production image (the demo), where that is the real one. There the DNIs
 * are left out: the daily reverification would send them to the real registry. Idempotent by each license's natural
 * key.
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
                $user->forceFill(['document_number' => $documentNumber, 'document_checked_at' => now()])->save();
            }

            // As if the professional had added every license the registry holds for them.
            ProfessionalLicenseSync::apply($user->id, $professionals, $catalog, addNew: true);
            ProfessionalLicense::query()->where('user_id', $user->id)->update(['attempted_at' => now()]);
        }
    }
}
