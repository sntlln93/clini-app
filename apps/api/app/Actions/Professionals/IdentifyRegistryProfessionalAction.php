<?php

declare(strict_types=1);

namespace App\Actions\Professionals;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Contracts\ProfessionalRegistry;
use App\Data\Professionals\RegistryDocumentData;
use App\Data\Professionals\RegistryIdentityData;
use App\Exceptions\Professionals\ProfessionalRegistryUnavailableException;
use App\Support\RegistryPersonName;

/**
 * Who the professional registry holds under a DNI (#417): the step before a DNI is loaded into an account, from Ajustes
 * or from a professional invitation. Null when it holds no one, or no one it gives a name for. A paused or failing
 * registry is an error, never «not found»: without the registry no DNI is loaded and nobody accepts as a professional.
 *
 * @implements Action<RegistryDocumentData>
 */
class IdentifyRegistryProfessionalAction implements Action
{
    public function __construct(private readonly ProfessionalRegistry $registry) {}

    /**
     * @param  RegistryDocumentData  $dto
     *
     * @throws ProfessionalRegistryUnavailableException
     */
    public function handle(Data $dto): ?RegistryIdentityData
    {
        if (! $this->registry->available()) {
            throw new ProfessionalRegistryUnavailableException('unavailable');
        }

        $professionals = $this->registry->lookUp($dto->documentNumber);
        $name = RegistryPersonName::of($professionals);

        return $name === null ? null : new RegistryIdentityData($name, $professionals);
    }
}
