<?php

declare(strict_types=1);

namespace App\Events\Appointments;

use App\Models\Appointment;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Dispatched only when an appointment is booked (BookAppointmentAction),
 * after the transaction that created it commits — never inside the
 * closure, so a rollback never leaves listeners reacting to an appointment
 * that doesn't exist. RescheduleAppointmentAction delegates into
 * BookAppointmentAction, so a rescheduled appointment fires this too.
 */
final readonly class AppointmentBooked
{
    use Dispatchable;

    public function __construct(
        public Appointment $appointment,
    ) {}
}
