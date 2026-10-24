<?php

declare(strict_types=1);

namespace App\Data\ClinicalAccess;

use App\Contracts\Data;
use App\Enums\ClinicalAccessAction;

/**
 * A read of the clinical history: the patient's whole history, or only what the reader wrote on one appointment of
 * theirs (`appointmentId`).
 */
final readonly class PatientHistoryReadData implements Data
{
    public function __construct(
        public int $organizationId,
        public int $membershipId,
        public int $patientId,
        public ClinicalAccessAction $action,
        public ?int $appointmentId = null,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'organizationId' => $this->organizationId,
            'membershipId' => $this->membershipId,
            'patientId' => $this->patientId,
            'action' => $this->action->value,
            'appointmentId' => $this->appointmentId,
        ];
    }
}
