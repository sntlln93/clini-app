<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Contracts\TwoFactorAuthenticator;
use App\Data\Auth\TwoFactorChallengeData;
use App\Exceptions\Auth\TwoFactorCodeInvalidException;
use App\Exceptions\Auth\TwoFactorNotEnabledException;
use App\Models\User;
use App\Support\TwoFactorRecoveryCodes;
use Illuminate\Support\Facades\DB;

/**
 * Checks the login's second step under the user's row lock, so two
 * concurrent requests can't both spend the same recovery code or the same
 * authenticator step.
 *
 * @implements Action<TwoFactorChallengeData>
 */
class VerifyTwoFactorChallengeAction implements Action
{
    public function __construct(
        private readonly TwoFactorAuthenticator $authenticator,
    ) {}

    /**
     * @param  TwoFactorChallengeData  $dto
     */
    public function handle(Data $dto): User
    {
        return DB::transaction(function () use ($dto): User {
            $user = User::query()->lockForUpdate()->findOrFail($dto->user->id);

            $secret = $user->two_factor_secret;

            // Turned off (or reset by support) after the password step.
            if (! $user->hasTwoFactorEnabled() || ! is_string($secret)) {
                throw new TwoFactorNotEnabledException($user->id);
            }

            if ($dto->recoveryCode !== null) {
                $this->spendRecoveryCode($user, $dto->recoveryCode);

                return $user;
            }

            $step = $this->authenticator->verify($secret, (string) $dto->code, $user->two_factor_last_used_step);

            if ($step === null) {
                throw new TwoFactorCodeInvalidException($user->id);
            }

            $user->forceFill(['two_factor_last_used_step' => $step])->save();

            return $user;
        });
    }

    private function spendRecoveryCode(User $user, string $candidate): void
    {
        /** @var list<string> $codes */
        $codes = array_values($user->two_factor_recovery_codes ?? []);
        $index = TwoFactorRecoveryCodes::find($codes, $candidate);

        if ($index === null) {
            throw new TwoFactorCodeInvalidException($user->id);
        }

        unset($codes[$index]);

        $user->forceFill(['two_factor_recovery_codes' => array_values($codes)])->save();
    }
}
