<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Data\Professionals\RegistryProfessionalData;
use App\Exceptions\Professionals\ProfessionalRegistryUnavailableException;

interface ProfessionalRegistry
{
    /**
     * Whether it may be asked now: turned on, and not failing recently.
     */
    public function available(): bool;

    /**
     * An empty list when the registry holds no one under that DNI.
     *
     * @return list<RegistryProfessionalData>
     *
     * @throws ProfessionalRegistryUnavailableException
     */
    public function lookUp(string $documentNumber): array;
}
