<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Contracts\TwoFactorAuthenticator;
use App\Data\Auth\TwoFactorConfirmationData;
use App\Exceptions\Auth\TwoFactorAlreadyEnabledException;
use App\Exceptions\Auth\TwoFactorCodeInvalidException;
use App\Exceptions\Auth\TwoFactorSetupMissingException;
use App\Models\User;
use App\Support\TwoFactorRecoveryCodes;
use Illuminate\Support\Facades\DB;

/**
 * Turns the factor on once the authenticator app proves it holds the
 * secret, and hands back the recovery codes: the only time they are shown.
 *
 * @implements Action<TwoFactorConfirmationData>
 */
class ConfirmTwoFactorSetupAction implements Action
{
    public function __construct(
        private readonly TwoFactorAuthenticator $authenticator,
    ) {}

    /**
     * @param  TwoFactorConfirmationData  $dto
     * @return list<string>
     */
    public function handle(Data $dto): array
    {
        return DB::transaction(function () use ($dto): array {
            $user = User::query()->lockForUpdate()->findOrFail($dto->user->id);

            if ($user->hasTwoFactorEnabled()) {
                throw new TwoFactorAlreadyEnabledException($user->id);
            }

            $secret = $user->two_factor_secret;

            if (! is_string($secret)) {
                throw new TwoFactorSetupMissingException($user->id);
            }

            $step = $this->authenticator->verify($secret, $dto->code, null);

            if ($step === null) {
                throw new TwoFactorCodeInvalidException($user->id);
            }

            $codes = TwoFactorRecoveryCodes::generate();

            $user->forceFill([
                'two_factor_recovery_codes' => $codes,
                'two_factor_confirmed_at' => now(),
                // The code that confirmed the setup can't also open a login.
                'two_factor_last_used_step' => $step,
            ])->save();

            return $codes;
        });
    }
}
