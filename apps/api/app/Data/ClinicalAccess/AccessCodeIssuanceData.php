<?php

declare(strict_types=1);

namespace App\Data\ClinicalAccess;

use App\Contracts\Data;

/**
 * The appointment a patient's access code is issued for (#364, ADR 0029).
 */
final readonly class AccessCodeIssuanceData implements Data
{
    public function __construct(
        public int $appointmentId,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'appointmentId' => $this->appointmentId,
        ];
    }
}
