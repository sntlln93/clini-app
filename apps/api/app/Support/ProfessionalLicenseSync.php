<?php

declare(strict_types=1);

namespace App\Support;

use App\Data\Professionals\RegistryProfessionalData;
use App\Enums\HealthProfession;
use App\Models\ProfessionalLicense;

/**
 * Brings a professional's licenses in line with one registry answer for their DNI (#387, ADR 0038). Each license the
 * registry holds becomes a row (new ones not in Clini until the professional adds them), every row gets what the
 * answer says about it, and one the registry no longer holds is «not found» if it was in Clini, or goes away if it
 * wasn't. A license whose province or profession Clini doesn't know can't be kept, and is left out.
 */
final class ProfessionalLicenseSync
{
    /**
     * @param  list<RegistryProfessionalData>  $professionals
     * @param  array<string, int>  $catalog  `RegistrySpecialtyCatalog::record()` of the same answer
     * @param  bool  $addNew  whether a license new to Clini is added to it right away, as the fixture does
     */
    public static function apply(int $userId, array $professionals, array $catalog, bool $addNew = false): void
    {
        $licenses = ProfessionalLicense::query()->where('user_id', $userId)->get();

        foreach ($professionals as $professional) {
            foreach ($professional->licenses as $registered) {
                $profession = HealthProfession::fromRegistryName($registered->profession);

                if ($profession === null || $registered->province === null) {
                    continue;
                }

                $held = $licenses->first(fn (ProfessionalLicense $license): bool => $license->province === $registered->province
                    && $license->profession === $profession
                    && ProfessionalLicenseMatch::sameNumber($registered->number, $license->number));

                if ($held === null) {
                    $licenses->push(ProfessionalLicense::query()->create([
                        'user_id' => $userId,
                        'province' => $registered->province,
                        'profession' => $profession,
                        'number' => ProfessionalLicense::normalizedNumber($registered->number),
                    ])->forceFill(['added_at' => $addNew ? now() : null]));
                }
            }
        }

        foreach ($licenses as $license) {
            $outcome = ProfessionalLicenseMatch::outcome($license->number, $license->province, $license->profession, $professionals);

            if ($outcome->license === null && $license->added_at === null) {
                $license->delete();

                continue;
            }

            $specialty = $outcome->license === null
                ? null
                : $catalog[RegistrySpecialtyCatalog::key($license->profession, RegistrySpecialtyCatalog::name($license->profession, $outcome->license->specialty))] ?? null;

            $license->forceFill([
                'status' => $outcome->status,
                'mismatch_reason' => $outcome->mismatchReason,
                'refeps_code' => $outcome->refepsCode,
                'issuer' => $outcome->license?->issuer,
                'specialty_id' => $specialty,
                'situation' => $outcome->license?->situation,
                'checked_at' => now(),
            ])->save();
        }
    }
}
