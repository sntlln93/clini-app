<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Admin\CreatePlatformAdminAction;
use App\Data\Admin\PlatformAdminRegistrationData;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;

/**
 * The only way to create a platform operator in production and on the demo
 * server (the seeder skips its operator there). Missing options are
 * prompted — the password twice, hidden — unless `--no-interaction`, where
 * a missing option is a validation failure. The email is trimmed and
 * lowercased before validation, matching the dashboard login.
 */
#[Signature('admin:create {--name= : Display name} {--email= : Login email} {--password= : Avoid in shared shells; prompted securely when omitted}')]
#[Description('Creates a platform operator for the dashboard')]
class CreatePlatformAdminCommand extends Command
{
    public function handle(CreatePlatformAdminAction $action): int
    {
        $interactive = $this->input->isInteractive();

        $name = $this->stringOption('name') ?? ($interactive ? $this->stringOf($this->ask('Nombre')) : null);
        $email = $this->stringOption('email') ?? ($interactive ? $this->stringOf($this->ask('Correo electrónico')) : null);
        $password = $this->stringOption('password');

        if ($password === null && $interactive) {
            $password = $this->stringOf($this->secret('Contraseña'));
            $confirmation = $this->stringOf($this->secret('Repetí la contraseña'));

            if ($password !== $confirmation) {
                $this->error('Las contraseñas no coinciden.');

                return self::FAILURE;
            }
        }

        $email = $email === null ? null : mb_strtolower(trim($email));

        $validator = Validator::make(
            ['name' => $name, 'email' => $email, 'password' => $password],
            [
                'name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'email', 'max:255', 'unique:platform_admins,email'],
                'password' => ['required', 'string', 'min:12'],
            ],
        );

        if ($validator->fails() || $name === null || $email === null || $password === null) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        $admin = $action->handle(new PlatformAdminRegistrationData(
            name: $name,
            email: $email,
            password: $password,
        ));

        $this->info("Operador creado: {$admin->email} (id {$admin->id})");

        return self::SUCCESS;
    }

    private function stringOption(string $key): ?string
    {
        return $this->stringOf($this->option($key));
    }

    private function stringOf(mixed $value): ?string
    {
        return is_string($value) && $value !== '' ? $value : null;
    }
}
