<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Auth\RenameUserAction;
use App\Console\Commands\Concerns\FindsClinicUserByEmail;
use App\Data\Auth\UserRenameData;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

/**
 * Support's way to change a clinic user's name (#417): an account with a DNI takes the registry's and can't change it
 * itself, so an accent the registry leaves out, or a name the person doesn't use, comes through here. Confirming the
 * requester's identity is support's job, before running it.
 */
#[Signature('user:rename {email : The clinic user\'s login email} {name : The name, as the person writes it}')]
#[Description('Changes a clinic user\'s name')]
class RenameUserCommand extends Command
{
    use FindsClinicUserByEmail;

    public function handle(RenameUserAction $action): int
    {
        $user = $this->clinicUserFromEmailArgument();

        if ($user === null) {
            return self::FAILURE;
        }

        $argument = $this->argument('name');
        $name = is_string($argument) ? trim((string) preg_replace('/\s+/u', ' ', $argument)) : '';

        if ($name === '' || mb_strlen($name) > 255) {
            $this->error('El nombre no puede estar vacío ni pasar los 255 caracteres.');

            return self::FAILURE;
        }

        if (! $this->confirm("¿Cambiar el nombre de este usuario a «{$name}»?", true)) {
            return self::FAILURE;
        }

        $action->handle(new UserRenameData($user->id, $name));

        $this->info('Listo: el usuario ya figura con el nombre nuevo.');

        return self::SUCCESS;
    }
}
