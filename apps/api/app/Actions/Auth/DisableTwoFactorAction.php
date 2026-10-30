<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Auth\TwoFactorAccountData;
use App\Exceptions\Auth\TwoFactorNotEnabledException;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Drops the secret and the recovery codes, also from a setup that was never
 * confirmed; the FormRequest already checked the password.
 *
 * @implements Action<TwoFactorAccountData>
 */
class DisableTwoFactorAction implements Action
{
    /**
     * @param  TwoFactorAccountData  $dto
     */
    public function handle(Data $dto): User
    {
        return DB::transaction(function () use ($dto): User {
            $user = User::query()->lockForUpdate()->findOrFail($dto->user->id);

            if ($user->two_factor_secret === null) {
                throw new TwoFactorNotEnabledException($user->id);
            }

            $user->forceFill([
                'two_factor_secret' => null,
                'two_factor_recovery_codes' => null,
                'two_factor_confirmed_at' => null,
                'two_factor_last_used_step' => null,
            ])->save();

            return $user;
        });
    }
}
