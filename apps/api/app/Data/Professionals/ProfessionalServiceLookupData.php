<?php

declare(strict_types=1);

namespace App\Data\Professionals;

use App\Contracts\Data;

final readonly class ProfessionalServiceLookupData implements Data
{
    public function __construct(
        public int $organizationId,
        public int $membershipId,
        public int $serviceId,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'organizationId' => $this->organizationId,
            'membershipId' => $this->membershipId,
            'serviceId' => $this->serviceId,
        ];
    }
}
