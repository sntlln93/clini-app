<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\ExternalSource;
use App\Exceptions\Medications\MedicationSourceUnavailableException;
use App\Services\Medications\NationalMedicationSearchService;
use App\Support\ExternalSourceOutage;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Config;

/**
 * Asks the national medication search for a term that always has products (#425), paused or not, so an outage is
 * noticed and its end seen without waiting for a professional to search. What it reads starts, extends or ends the
 * same outage a search does. With the source off there is nothing to probe, and an outage recorded before it was
 * turned off is forgotten.
 */
#[Description('Checks that the national medication search answers with products')]
#[Signature('medications:probe-source')]
class ProbeMedicationSourceCommand extends Command
{
    public function handle(): int
    {
        if (! Config::boolean('services.national_medication_search.enabled')) {
            (new ExternalSourceOutage(ExternalSource::MedicationSearch))->clear();
            $this->info('El buscador de medicamentos está apagado: no hay nada que probar.');

            return self::SUCCESS;
        }

        try {
            $products = $this->laravel->make(NationalMedicationSearchService::class)
                ->probe(Config::string('services.national_medication_search.probe_term'));
        } catch (MedicationSourceUnavailableException $exception) {
            $this->error($exception->step === 'response'
                ? 'El buscador respondió algo que no se puede leer o ningún producto para el término de prueba (response).'
                : "El buscador no respondió ({$exception->step}).");

            return self::FAILURE;
        }

        $this->info("El buscador respondió {$products} productos para el término de prueba.");

        return self::SUCCESS;
    }
}
