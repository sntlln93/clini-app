<?php

declare(strict_types=1);

namespace App\Data\Appointments;

use App\Contracts\Data;

final readonly class AppointmentCancellationData implements Data
{
    public function __construct(
        public int $appointmentId,
        public ?int $cancelledBy,
        public ?string $cancellationReason,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'appointmentId' => $this->appointmentId,
            'cancelledBy' => $this->cancelledBy,
            'cancellationReason' => $this->cancellationReason,
        ];
    }
}
