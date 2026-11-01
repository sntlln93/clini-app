<?php

declare(strict_types=1);

namespace App\Actions\Professionals;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Professionals\ProfessionalDocumentData;
use App\Data\Professionals\ProfessionalLicenseVerificationData;
use App\Models\ProfessionalLicense;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Sets the DNI a professional's licenses are looked up with (#380). A different DNI makes what the registry said about
 * the old one stale, so every license goes back to unverified before being checked again.
 *
 * @implements Action<ProfessionalDocumentData>
 */
class UpdateProfessionalDocumentAction implements Action
{
    public function __construct(private readonly VerifyProfessionalLicensesAction $verify) {}

    /**
     * @param  ProfessionalDocumentData  $dto
     */
    public function handle(Data $dto): User
    {
        $changed = DB::transaction(function () use ($dto): bool {
            $user = User::query()->whereKey($dto->userId)->lockForUpdate()->firstOrFail();

            if ($user->document_number === $dto->documentNumber) {
                return false;
            }

            $user->forceFill(['document_number' => $dto->documentNumber])->save();

            ProfessionalLicense::query()->where('user_id', $user->id)->update([
                ...ProfessionalLicense::UNVERIFIED,
                'updated_at' => now(),
            ]);

            return true;
        });

        if ($changed) {
            $this->verify->handle(new ProfessionalLicenseVerificationData($dto->userId));
        }

        return User::query()->findOrFail($dto->userId);
    }
}
