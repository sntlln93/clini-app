<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Data\Professionals\RegistryProfessionalData;
use App\Exceptions\Professionals\ProfessionalRegistryUnavailableException;

/**
 * Where a professional's licenses are checked (#380, ADR 0032). Today the Buscador Nacional de Profesionales de la
 * Salud; the official REFEPS access (#379) is another adapter and another binding.
 */
interface ProfessionalRegistry
{
    /**
     * Whether it may be asked now: turned on, and not failing recently.
     */
    public function available(): bool;

    /**
     * Every professional the registry holds under that DNI, with all their licenses; an empty list when it holds none.
     *
     * @return list<RegistryProfessionalData>
     *
     * @throws ProfessionalRegistryUnavailableException
     */
    public function lookUp(string $documentNumber): array;
}
