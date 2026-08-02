<?php

declare(strict_types=1);

namespace App\Events\Appointments;

use App\Models\Appointment;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Dispatched only when an appointment is booked (BookAppointmentAction),
 * outside the closure of BookAppointmentAction's own DB::transaction, on
 * the same connection/transaction — the guarantee is "same atomic commit",
 * not "after commit". RescheduleAppointmentAction wraps the whole
 * reschedule in its own DB::transaction and delegates into
 * BookAppointmentAction, so on that path this dispatch runs nested
 * (savepoint) inside the outer transaction and fires *before* the real
 * COMMIT: a rollback of the outer transaction unwinds it too, but only
 * because listener side effects run on the same connection/transaction.
 *
 * A listener with a non-transactional side effect (sending an email,
 * calling an external API) cannot rely on this dispatch — it needs
 * DB::afterCommit() / ShouldHandleEventsAfterCommit instead, otherwise on
 * the reschedule path that effect would fire before the real commit and
 * survive a rollback.
 */
final readonly class AppointmentBooked
{
    use Dispatchable;

    public function __construct(
        public Appointment $appointment,
    ) {}
}
