<?php

declare(strict_types=1);

namespace App\Actions\Professionals;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Professionals\ProfessionalLicenseRegistrationData;
use App\Data\Professionals\ProfessionalLicenseVerificationData;
use App\Models\ProfessionalLicense;

/**
 * Adds a license a professional declares and checks it against the registry right away (#380). Declaring the same one
 * twice keeps the first. A registry that is off or failing leaves it unverified, never refused.
 *
 * @implements Action<ProfessionalLicenseRegistrationData>
 */
class RegisterProfessionalLicenseAction implements Action
{
    public function __construct(private readonly VerifyProfessionalLicensesAction $verify) {}

    /**
     * @param  ProfessionalLicenseRegistrationData  $dto
     */
    public function handle(Data $dto): ProfessionalLicense
    {
        $license = ProfessionalLicense::query()->firstOrCreate([
            'user_id' => $dto->userId,
            'province' => $dto->province,
            'profession' => $dto->profession,
            'number' => ProfessionalLicense::normalizedNumber($dto->number),
        ]);

        if ($license->wasRecentlyCreated) {
            $this->verify->handle(new ProfessionalLicenseVerificationData($dto->userId));
        }

        return $license->refresh();
    }
}
