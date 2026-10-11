<?php

declare(strict_types=1);

namespace App\Data\Organizations;

use App\Contracts\Data;

final readonly class OrganizationLogoRemovalData implements Data
{
    public function __construct(
        public int $organizationId,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'organizationId' => $this->organizationId,
        ];
    }
}
