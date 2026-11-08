<?php

declare(strict_types=1);

namespace App\Data\Professionals;

use App\Contracts\Data;

/**
 * A professional as the national registry answers about them (#380): what a license check needs, and their name, which
 * becomes the account's (#417, `RegistryPersonName`). Never their CUIL or sex, which the registry answers too.
 */
final readonly class RegistryProfessionalData implements Data
{
    /**
     * @param  list<RegistryLicenseData>  $licenses
     */
    public function __construct(
        public ?string $refepsCode,
        public bool $active,
        public array $licenses,
        public ?string $name = null,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'refepsCode' => $this->refepsCode,
            'name' => $this->name,
            'active' => $this->active,
            'licenses' => array_map(fn (RegistryLicenseData $license): array => $license->toArray(), $this->licenses),
        ];
    }
}
