<?php

declare(strict_types=1);

namespace App\Data\Appointments;

use App\Contracts\Data;
use Carbon\CarbonImmutable;

final readonly class AppointmentReschedulingData implements Data
{
    public function __construct(
        public int $appointmentId,
        public CarbonImmutable $startAt,
        public ?int $rescheduledBy,
        public ?string $reason,
        public ?string $notes,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'appointmentId' => $this->appointmentId,
            'startAt' => $this->startAt,
            'rescheduledBy' => $this->rescheduledBy,
            'reason' => $this->reason,
            'notes' => $this->notes,
        ];
    }
}
