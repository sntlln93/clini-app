<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Auth\DisableTwoFactorAction;
use App\Data\Auth\TwoFactorAccountData;
use App\Exceptions\Auth\TwoFactorNotEnabledException;
use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

/**
 * Support's way back in for a clinic user who lost both the authenticator
 * and the recovery codes (#357): turns their second factor off so the
 * password alone logs in again. Confirming who is asking is support's job,
 * before running it.
 */
#[Signature('user:reset-two-factor {email : The clinic user\'s login email}')]
#[Description('Turns off a clinic user\'s two-factor authentication')]
class ResetUserTwoFactorCommand extends Command
{
    public function handle(DisableTwoFactorAction $action): int
    {
        $argument = $this->argument('email');
        $email = is_string($argument) ? trim($argument) : '';
        // Clinic emails are stored as typed and unique only as typed: an exact
        // match wins, and otherwise one ignoring case, only when it is the
        // only one, so the reset never lands on the wrong account.
        $user = User::query()->where('email', $email)->first();
        $matches = $user !== null
            ? collect([$user])
            : User::query()->whereRaw('lower(email) = ?', [mb_strtolower($email)])->limit(2)->get();

        if ($matches->count() !== 1) {
            $this->error($matches->isEmpty()
                ? 'No hay ningún usuario con ese correo.'
                : 'Hay más de un usuario con ese correo en otras mayúsculas: escribilo exactamente como está guardado.');

            return self::FAILURE;
        }

        /** @var User $user */
        $user = $matches->first();

        if (! $this->confirm('¿Desactivar la verificación en dos pasos de este usuario?', true)) {
            return self::FAILURE;
        }

        try {
            $action->handle(new TwoFactorAccountData($user));
        } catch (TwoFactorNotEnabledException) {
            $this->error('Ese usuario no tiene la verificación en dos pasos activada.');

            return self::FAILURE;
        }

        $this->info('Listo: el usuario vuelve a ingresar solo con su contraseña.');

        return self::SUCCESS;
    }
}
