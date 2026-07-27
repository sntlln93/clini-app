<?php

declare(strict_types=1);

namespace App\Data\Appointments;

use App\Contracts\Data;
use App\Enums\AppointmentStatus;

final readonly class AppointmentStatusTransitionData implements Data
{
    public function __construct(
        public int $appointmentId,
        public AppointmentStatus $status,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'appointmentId' => $this->appointmentId,
            'status' => $this->status,
        ];
    }
}
