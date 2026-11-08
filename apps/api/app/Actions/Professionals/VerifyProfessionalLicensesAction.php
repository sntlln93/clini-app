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
use App\Support\ProfessionalLicenseMatch;
use App\Support\RegistrySpecialtyCatalog;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Checks every license of a professional against the registry with one lookup of their DNI (#380, ADR 0032). Without
 * a DNI, or with the registry paused or failing, nothing changes: a license keeps what the registry last said (unverified
 * when it never answered), and nothing in the panel waits on it; only a `strict` check, the professional's own request,
 * says so with `professionals.registry_unavailable`. Every lookup stamps `attempted_at`, answered or not. The lookup
 * runs outside any transaction; its answer is written only if the DNI is still the one looked up. Every answer also
 * fills the specialties catalog (#387), and each license keeps the catalog row it backs while verified.
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

        if (! is_string($documentNumber) || ! $user->professionalLicenses()->exists()) {
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

            foreach ($this->licenses($user->id) as $license) {
                $outcome = ProfessionalLicenseMatch::outcome($license->number, $license->province, $license->profession, $professionals);
                $specialty = $outcome->license === null
                    ? null
                    : RegistrySpecialtyCatalog::key($license->profession, RegistrySpecialtyCatalog::name($license->profession, $outcome->license->specialty));

                $license->forceFill([
                    'status' => $outcome->status,
                    'mismatch_reason' => $outcome->mismatchReason,
                    'refeps_code' => $outcome->refepsCode,
                    'issuer' => $outcome->license?->issuer,
                    'specialty_id' => $specialty === null ? null : ($catalog[$specialty] ?? null),
                    'situation' => $outcome->license?->situation,
                    'checked_at' => now(),
                ])->save();
            }
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
