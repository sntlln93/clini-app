<?php

declare(strict_types=1);

namespace App\Actions\Professionals;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Contracts\ProfessionalRegistry;
use App\Data\Professionals\ProfessionalLicenseVerificationData;
use App\Exceptions\Professionals\ProfessionalRegistryUnavailableException;
use App\Models\ProfessionalLicense;
use App\Models\User;
use App\Support\ProfessionalLicenseSync;
use App\Support\RegistrySpecialtyCatalog;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Looks a professional's DNI up in the registry (#380, ADR 0032) and brings their licenses in line with the answer
 * (#387, ADR 0038): the ones in Clini are checked again, and the registry's others are offered for the professional to
 * add (`ProfessionalLicenseSync`). Without a DNI, or with the registry paused or failing, nothing changes: a license
 * keeps what the registry last said, and nothing in the panel waits on it; only a `strict` check, the professional's
 * own request, says so with `professionals.registry_unavailable`. Every lookup stamps `attempted_at`, answered or not.
 * The lookup runs outside any transaction; its answer is written only if the DNI is still the one looked up, and it
 * stamps `document_checked_at`, so an answer with no license says the registry holds nobody under the DNI. Every
 * answer also fills the specialties catalog.
 *
 * @implements Action<ProfessionalLicenseVerificationData>
 */
class VerifyProfessionalLicensesAction implements Action
{
    public function __construct(private readonly ProfessionalRegistry $registry) {}

    /**
     * @param  ProfessionalLicenseVerificationData  $dto
     * @return Collection<int, ProfessionalLicense>
     */
    public function handle(Data $dto): Collection
    {
        $user = User::query()->findOrFail($dto->userId);
        $documentNumber = $user->document_number;

        if (! is_string($documentNumber)) {
            return $this->licenses($user->id);
        }

        if (! $this->registry->available()) {
            if ($dto->strict) {
                throw new ProfessionalRegistryUnavailableException('unavailable');
            }

            return $this->licenses($user->id);
        }

        ProfessionalLicense::query()->where('user_id', $user->id)->update(['attempted_at' => now(), 'updated_at' => now()]);

        try {
            $professionals = $this->registry->lookUp($documentNumber);
        } catch (ProfessionalRegistryUnavailableException $exception) {
            Log::warning($exception->getMessage(), $exception->logContext());

            if ($dto->strict) {
                throw $exception;
            }

            return $this->licenses($user->id);
        }

        DB::transaction(function () use ($user, $documentNumber, $professionals): void {
            $catalog = RegistrySpecialtyCatalog::record($professionals);
            $current = User::query()->whereKey($user->id)->lockForUpdate()->first();

            if ($current === null || $current->document_number !== $documentNumber) {
                return;
            }

            ProfessionalLicenseSync::apply($user->id, $professionals, $catalog);
            $current->forceFill(['document_checked_at' => now()])->save();
        });

        return $this->licenses($user->id);
    }

    /**
     * @return Collection<int, ProfessionalLicense>
     */
    private function licenses(int $userId): Collection
    {
        return ProfessionalLicense::query()->with('specialty')->where('user_id', $userId)->orderBy('id')->get();
    }
}
