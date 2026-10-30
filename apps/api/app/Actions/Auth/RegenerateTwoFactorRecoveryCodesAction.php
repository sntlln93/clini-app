<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Auth\TwoFactorAccountData;
use App\Exceptions\Auth\TwoFactorNotEnabledException;
use App\Models\User;
use App\Support\TwoFactorRecoveryCodes;
use Illuminate\Support\Facades\DB;

/**
 * Replaces every recovery code, used or not, so a printed copy of the old
 * ones stops working.
 *
 * @implements Action<TwoFactorAccountData>
 */
class RegenerateTwoFactorRecoveryCodesAction implements Action
{
    /**
     * @param  TwoFactorAccountData  $dto
     * @return list<string>
     */
    public function handle(Data $dto): array
    {
        return DB::transaction(function () use ($dto): array {
            $user = User::query()->lockForUpdate()->findOrFail($dto->user->id);

            if (! $user->hasTwoFactorEnabled()) {
                throw new TwoFactorNotEnabledException($user->id);
            }

            $codes = TwoFactorRecoveryCodes::generate();

            $user->forceFill(['two_factor_recovery_codes' => $codes])->save();

            return $codes;
        });
    }
}
