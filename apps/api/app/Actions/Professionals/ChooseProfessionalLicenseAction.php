<?php

declare(strict_types=1);

namespace App\Actions\Professionals;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Professionals\ProfessionalLicenseChoiceData;
use App\Enums\ProfessionalLicenseMismatch;
use App\Models\ProfessionalLicense;

/**
 * Adds to Clini a license the registry holds for the professional's DNI, or takes it out (#387, ADR 0038). Only one in
 * Clini backs specialties, and the first one settles the DNI. Taken out, it goes back to what the registry holds, or
 * away if the registry no longer holds it.
 *
 * @implements Action<ProfessionalLicenseChoiceData>
 */
class ChooseProfessionalLicenseAction implements Action
{
    /**
     * @param  ProfessionalLicenseChoiceData  $dto
     */
    public function handle(Data $dto): ?ProfessionalLicense
    {
        $license = ProfessionalLicense::query()->findOrFail($dto->licenseId);

        if ($dto->inClini) {
            if ($license->added_at === null) {
                $license->forceFill(['added_at' => now()])->save();
            }

            return $license->load('specialty');
        }

        if ($license->mismatch_reason === ProfessionalLicenseMismatch::NotFound) {
            $license->delete();

            return null;
        }

        $license->forceFill(['added_at' => null])->save();

        return $license->load('specialty');
    }
}
