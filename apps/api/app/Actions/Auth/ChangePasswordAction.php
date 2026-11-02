<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Auth\PasswordChangeData;
use App\Models\User;
use Illuminate\Support\Str;

/**
 * Writes the user's new password (#389); the FormRequest already checked the current one and the policy.
 *
 * The new hash is what ends the user's other sessions: Sanctum's `AuthenticateSession` logs out any session whose
 * stored hash no longer matches. A new remember token does the same for a "remember me" cookie.
 *
 * @implements Action<PasswordChangeData>
 */
class ChangePasswordAction implements Action
{
    /**
     * @param  PasswordChangeData  $dto
     */
    public function handle(Data $dto): User
    {
        $user = $dto->user;

        $user->forceFill([
            'password' => $dto->password,
            'remember_token' => Str::random(60),
        ])->save();

        return $user;
    }
}
