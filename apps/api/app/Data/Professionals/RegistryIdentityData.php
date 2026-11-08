<?php

declare(strict_types=1);

namespace App\Data\Professionals;

use App\Contracts\Data;

/**
 * Who the registry holds under a DNI (#417): the name the account takes, and the answer its licenses come from.
 */
final readonly class RegistryIdentityData implements Data
{
    /**
     * @param  list<RegistryProfessionalData>  $professionals
     */
    public function __construct(
        public string $name,
        public array $professionals,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'professionals' => array_map(fn (RegistryProfessionalData $professional): array => $professional->toArray(), $this->professionals),
        ];
    }
}
