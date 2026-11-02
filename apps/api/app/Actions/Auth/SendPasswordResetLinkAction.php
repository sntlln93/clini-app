<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Auth\PasswordResetLinkRecipientData;
use App\Mail\Auth\PasswordResetMail;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;

/**
 * Mails a password reset link to the clinic user with that address, if there is one (#389).
 *
 * Laravel's broker keeps one hashed token per address, single-use and valid for 60 minutes, and refuses a new one
 * within a minute of the last (`config/auth.php`). Whatever it answers (sent, no such user, too soon) stays here: the
 * caller always gets the same response, so it never learns whether the address has an account.
 *
 * @implements Action<PasswordResetLinkRecipientData>
 */
class SendPasswordResetLinkAction implements Action
{
    /**
     * @param  PasswordResetLinkRecipientData  $dto
     */
    public function handle(Data $dto): null
    {
        Password::broker('users')->sendResetLink(
            ['email' => $dto->email],
            function (User $user, string $token): void {
                Mail::to($user->email)->queue(new PasswordResetMail($user->name, self::resetUrl($token)));
            },
        );

        return null;
    }

    /**
     * The panel's reset page. The token alone: the address is typed again there, so it never travels in a URL.
     */
    private static function resetUrl(string $token): string
    {
        /** @var array<int, string> $allowedOrigins */
        $allowedOrigins = config('cors.allowed_origins', []);

        return rtrim($allowedOrigins[0] ?? 'http://localhost:5174', '/').'/restablecer-contrasena/'.$token;
    }
}
