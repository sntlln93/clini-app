<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Exceptions\Professionals\ProfessionalRegistryUnavailableException;
use App\Services\Professionals\NationalProfessionalSearchService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Config;

/**
 * Asks the national registry for a DNI nobody holds (#419), paused or not, so an outage is noticed and its end seen
 * without waiting for a professional to look one up. What it reads starts, extends or ends the same outage a lookup
 * does. The fake registry has nothing to probe.
 */
#[Description('Checks that the national professional registry answers')]
#[Signature('professionals:probe-registry')]
class ProbeProfessionalRegistryCommand extends Command
{
    public function handle(): int
    {
        if (Config::string('services.professional_registry.adapter') !== 'national_search') {
            $this->info('El registro configurado no es el nacional: no hay nada que probar.');

            return self::SUCCESS;
        }

        try {
            $readsNoResults = $this->laravel->make(NationalProfessionalSearchService::class)
                ->probe(Config::string('services.national_professional_search.probe_document'));
        } catch (ProfessionalRegistryUnavailableException $exception) {
            $this->error("El registro no respondió ({$exception->step}).");

            return self::FAILURE;
        }

        if (! $readsNoResults) {
            $this->error('El registro respondió, pero no «sin resultados»: el DNI de prueba (services.national_professional_search.probe_document) tiene que ser uno que nadie tenga.');

            return self::FAILURE;
        }

        $this->info('El registro respondió «sin resultados».');

        return self::SUCCESS;
    }
}
