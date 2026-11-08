<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Auth\DisableTwoFactorAction;
use App\Console\Commands\Concerns\FindsClinicUserByEmail;
use App\Data\Auth\TwoFactorAccountData;
use App\Exceptions\Auth\TwoFactorNotEnabledException;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

/**
 * Confirming the requester's identity is support's job, before running it.
 */
#[Signature('user:reset-two-factor {email : The clinic user\'s login email}')]
#[Description('Turns off a clinic user\'s two-factor authentication')]
class ResetUserTwoFactorCommand extends Command
{
    use FindsClinicUserByEmail;

    public function handle(DisableTwoFactorAction $action): int
    {
        $user = $this->clinicUserFromEmailArgument();

        if ($user === null) {
            return self::FAILURE;
        }

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
