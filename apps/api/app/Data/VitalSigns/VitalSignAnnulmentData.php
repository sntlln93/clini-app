<?php

declare(strict_types=1);

namespace App\Data\VitalSigns;

use App\Contracts\Data;

final readonly class VitalSignAnnulmentData implements Data
{
    public function __construct(
        public int $vitalSignId,
        public int $membershipId,
        public string $reason,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'vitalSignId' => $this->vitalSignId,
            'membershipId' => $this->membershipId,
            'reason' => $this->reason,
        ];
    }
}
