<?php

declare(strict_types=1);

namespace App\Data\Appointments;

use App\Contracts\Data;
use App\Enums\AppointmentOrigin;
use Carbon\CarbonImmutable;

final readonly class AppointmentBookingData implements Data
{
    public function __construct(
        public int $organizationId,
        public int $membershipId,
        public int $patientId,
        public int $serviceId,
        public ?int $createdBy,
        public CarbonImmutable $startAt,
        public AppointmentOrigin $origin,
        public ?string $reason,
        public ?string $notes,
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
            'serviceId' => $this->serviceId,
            'createdBy' => $this->createdBy,
            'startAt' => $this->startAt,
            'origin' => $this->origin,
            'reason' => $this->reason,
            'notes' => $this->notes,
        ];
    }
}
