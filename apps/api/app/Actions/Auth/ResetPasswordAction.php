<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Auth\PasswordResetData;
use App\Exceptions\Auth\PasswordResetInvalidOrExpiredException;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

/**
 * Sets a new password from a reset link (#389). The broker checks the token against the address and its 60 minutes,
 * and deletes it once used.
 *
 * It never signs anyone in: the user goes back to /login, which asks for the second factor when it is on (ADR 0026),
 * and a login is also what cancels a pending account deletion (#384). The new hash ends every session of the account
 * (Sanctum's `AuthenticateSession`), and a new remember token any "remember me" cookie.
 *
 * @implements Action<PasswordResetData>
 */
class ResetPasswordAction implements Action
{
    /**
     * @param  PasswordResetData  $dto
     */
    public function handle(Data $dto): null
    {
        $status = Password::broker('users')->reset(
            [
                'email' => $dto->email,
                'token' => $dto->token,
                'password' => $dto->password,
            ],
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($user));
            },
        );

        // An unknown address and a wrong or expired token answer alike, so the page never tells which it was.
        if ($status !== Password::PASSWORD_RESET) {
            throw new PasswordResetInvalidOrExpiredException;
        }

        return null;
    }
}
