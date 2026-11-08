<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Professionals\ResetProfessionalDocumentAction;
use App\Data\Professionals\ProfessionalDocumentResetData;
use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

/**
 * Support's way to change a settled DNI (#387, ADR 0038): it takes the DNI and its licenses away, and the professional
 * loads the right one in Ajustes › Matrículas. Confirming the requester's identity is support's job, before running it.
 * Never prints the DNI.
 */
#[Signature('user:reset-professional-document {email : The clinic user\'s login email}')]
#[Description('Takes a clinic user\'s DNI and licenses away so they can load their DNI again')]
class ResetProfessionalDocumentCommand extends Command
{
    public function handle(ResetProfessionalDocumentAction $action): int
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

            return self::FAILURE;
        }

        /** @var User $user */
        $user = $matches->first();

        if ($user->document_number === null) {
            $this->error('Ese usuario no tiene un DNI cargado.');

            return self::FAILURE;
        }

        if (! $this->confirm('¿Quitar el DNI y las matrículas de este usuario? Lo que el consultorio le ofrece queda, sin respaldo de matrícula hasta que vuelva a agregarlas.', true)) {
            return self::FAILURE;
        }

        $action->handle(new ProfessionalDocumentResetData($user->id));

        $this->info('Listo: el usuario puede cargar su DNI de nuevo en Ajustes › Matrículas.');

        return self::SUCCESS;
    }
}
