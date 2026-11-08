<?php

declare(strict_types=1);

namespace App\Actions\Professionals;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Professionals\ProfessionalDocumentData;
use App\Data\Professionals\ProfessionalLicenseVerificationData;
use App\Exceptions\Professionals\ProfessionalDocumentLockedException;
use App\Models\ProfessionalLicense;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Sets the DNI a professional's licenses are looked up with (#380), and looks it up. Once a license the registry holds
 * for it is in Clini the DNI is settled and only support changes it (#387, ADR 0038); until then it can be corrected,
 * and what the registry held for the old one goes away, since it was someone else's.
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

            if ($user->hasLockedProfessionalDocument()) {
                throw new ProfessionalDocumentLockedException;
            }

            $user->forceFill(['document_number' => $dto->documentNumber, 'document_checked_at' => null])->save();

            // What the registry held for the old DNI: none of it is in Clini, or the DNI would be locked.
            ProfessionalLicense::query()->where('user_id', $user->id)->delete();

            return true;
        });

        if ($changed) {
            $this->verify->handle(new ProfessionalLicenseVerificationData($dto->userId));
        }

        return User::query()->findOrFail($dto->userId);
    }
}
