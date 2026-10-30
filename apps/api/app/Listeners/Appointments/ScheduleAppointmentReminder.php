<?php

declare(strict_types=1);

namespace App\Listeners\Appointments;

use App\Enums\ReminderChannel;
use App\Enums\ReminderStatus;
use App\Events\Appointments\AppointmentBooked;
use App\Models\Reminder;
use Illuminate\Support\Carbon;

/**
 * A single Reminder is scheduled for 12h before the appointment's start_at,
 * only when the patient has a confirmed email contact to send it to (#365)
 * and that time hasn't already passed. Silently skips otherwise — a missing reminder is not an
 * error condition.
 */
final readonly class ScheduleAppointmentReminder
{
    private const int HOURS_BEFORE = 12;

    public function handle(AppointmentBooked $event): void
    {
        $appointment = $event->appointment;

        if ($appointment->patient?->contacts()->forReminders()->exists() !== true) {
            return;
        }

        /** @var Carbon $startAt */
        $startAt = $appointment->start_at;
        $scheduledAt = $startAt->clone()->subHours(self::HOURS_BEFORE);

        if ($scheduledAt->lessThanOrEqualTo(now())) {
            return;
        }

        Reminder::create([
            'organization_id' => $appointment->organization_id,
            'appointment_id' => $appointment->id,
            'channel' => ReminderChannel::Email,
            'status' => ReminderStatus::Pending,
            'scheduled_at' => $scheduledAt,
        ]);
    }
}
