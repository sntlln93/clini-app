<?php

declare(strict_types=1);

namespace App\Console\Commands\Concerns;

use App\Models\User;
use Illuminate\Console\Command;

/**
 * The clinic user a support command names by the `email` argument.
 *
 * @mixin Command
 */
trait FindsClinicUserByEmail
{
    /**
     * Null, with the reason already printed, when no single user matches.
     */
    private function clinicUserFromEmailArgument(): ?User
    {
        $argument = $this->argument('email');
        $email = is_string($argument) ? trim($argument) : '';
        // Emails are unique only as typed: fall back to a case-insensitive match only when it is unambiguous.
        $user = User::query()->where('email', $email)->first();
        $matches = $user !== null
            ? collect([$user])
            : User::query()->whereRaw('lower(email) = ?', [mb_strtolower($email)])->limit(2)->get();

        if ($matches->count() !== 1) {
            $this->error($matches->isEmpty()
                ? 'No hay ningún usuario con ese correo.'
                : 'Hay más de un usuario con ese correo en otras mayúsculas: escribilo exactamente como está guardado.');

            return null;
        }

        return $matches->first();
    }
}
