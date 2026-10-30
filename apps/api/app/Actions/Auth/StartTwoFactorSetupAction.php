<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Contracts\TwoFactorAuthenticator;
use App\Data\Auth\TwoFactorAccountData;
use App\Data\Auth\TwoFactorSecretData;
use App\Exceptions\Auth\TwoFactorAlreadyEnabledException;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Stores a new secret that guards nothing until a code confirms it
 * (`ConfirmTwoFactorSetupAction`); starting again replaces a setup that was
 * never confirmed.
 *
 * @implements Action<TwoFactorAccountData>
 */
class StartTwoFactorSetupAction implements Action
{
    public function __construct(
        private readonly TwoFactorAuthenticator $authenticator,
    ) {}

    /**
     * @param  TwoFactorAccountData  $dto
     */
    public function handle(Data $dto): TwoFactorSecretData
    {
        return DB::transaction(function () use ($dto): TwoFactorSecretData {
            $user = User::query()->lockForUpdate()->findOrFail($dto->user->id);

            if ($user->hasTwoFactorEnabled()) {
                throw new TwoFactorAlreadyEnabledException($user->id);
            }

            $secret = $this->authenticator->generateSecret();

            $user->forceFill([
                'two_factor_secret' => $secret,
                'two_factor_recovery_codes' => null,
                'two_factor_confirmed_at' => null,
                'two_factor_last_used_step' => null,
            ])->save();

            $uri = $this->authenticator->provisioningUri($user->email, $secret);

            return new TwoFactorSecretData(
                secret: $secret,
                provisioningUri: $uri,
                qrCodeSvg: $this->authenticator->qrCodeSvg($uri),
            );
        });
    }
}
