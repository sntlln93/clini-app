<?php

declare(strict_types=1);

namespace App\Data\Professionals;

use App\Contracts\Data;

final readonly class ProfessionalServiceAssignmentData implements Data
{
    public function __construct(
        public int $organizationId,
        public int $membershipId,
        public int $serviceId,
        public int $durationMinutes,
        public ?int $priceCents,
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
            'durationMinutes' => $this->durationMinutes,
            'priceCents' => $this->priceCents,
        ];
    }
}
