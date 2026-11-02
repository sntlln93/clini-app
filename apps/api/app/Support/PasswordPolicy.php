<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Validation\Rules\Password;

/**
 * The one rule for choosing a password (#389), clinic users and platform operators alike: registering, accepting an
 * invitation, changing it, resetting it and `admin:create`. `Password::defaults()` is set in AppServiceProvider; this
 * class only holds its Spanish messages, which every entry point merges into its own.
 *
 * It applies when a password is chosen, never at login, so an older, shorter password keeps working.
 */
final class PasswordPolicy
{
    public const int MIN_LENGTH = 12;

    /** How long the breach check waits for Have I Been Pwned before letting the password through. */
    public const int BREACH_CHECK_TIMEOUT_SECONDS = 5;

    /**
     * The rule `Password::defaults()` returns: the length, and the password missing from the breaches Have I Been
     * Pwned knows, asked by the first five characters of its SHA-1 alone (k-anonymity). An unreachable service lets
     * the password through.
     */
    public static function rule(): Password
    {
        return Password::min(self::MIN_LENGTH)->uncompromised();
    }

    /**
     * @return array<string, string>
     */
    public static function messages(string $attribute = 'password'): array
    {
        return [
            "{$attribute}.required" => 'Ingresá una contraseña.',
            "{$attribute}.min" => 'La contraseña debe tener al menos '.self::MIN_LENGTH.' caracteres.',
            "{$attribute}.confirmed" => 'Las contraseñas no coinciden.',
            // `Password` reports a breached password under the rule `password.uncompromised`.
            "{$attribute}.password.uncompromised" => 'Esta contraseña apareció en una filtración de datos de otro sitio. Elegí otra.',
        ];
    }
}
