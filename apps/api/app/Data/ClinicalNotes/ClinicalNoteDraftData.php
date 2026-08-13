<?php

declare(strict_types=1);

namespace App\Data\ClinicalNotes;

use App\Contracts\Data;

final readonly class ClinicalNoteDraftData implements Data
{
    public function __construct(
        public int $organizationId,
        public int $appointmentId,
        public int $membershipId,
        public string $body,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'organizationId' => $this->organizationId,
            'appointmentId' => $this->appointmentId,
            'membershipId' => $this->membershipId,
            'body' => $this->body,
        ];
    }
}
