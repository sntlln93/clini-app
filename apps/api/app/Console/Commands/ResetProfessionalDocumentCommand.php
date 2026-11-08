<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Professionals\ResetProfessionalDocumentAction;
use App\Console\Commands\Concerns\FindsClinicUserByEmail;
use App\Data\Professionals\ProfessionalDocumentResetData;
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
    use FindsClinicUserByEmail;

    public function handle(ResetProfessionalDocumentAction $action): int
    {
        $user = $this->clinicUserFromEmailArgument();

        if ($user === null) {
            return self::FAILURE;
        }

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
