<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\AppointmentStatus;
use App\Enums\ReminderStatus;
use App\Mail\Appointments\AppointmentReminderMail;
use App\Models\Reminder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * No queues: this runs synchronously from the scheduler, once a minute
 * (routes/console.php). Never reprocesses `sent`/`failed` reminders and
 * never retries a failed send automatically — one attempt per reminder.
 *
 * Doesn't scope to a current organization on purpose: BelongsToOrganization
 * no-ops its global scope when none is set, which is always the case here
 * (CLI context).
 */
class SendDueRemindersCommand extends Command
{
    protected $signature = 'reminders:send-due';

    protected $description = 'Sends every reminder whose scheduled time has arrived';

    public function handle(): int
    {
        $reminders = Reminder::query()
            ->where('status', ReminderStatus::Pending)
            ->where('scheduled_at', '<=', now())
            ->with(['appointment.patient', 'appointment.membership.user', 'appointment.service', 'appointment.organization'])
            ->get();

        foreach ($reminders as $reminder) {
            $this->processReminder($reminder);
        }

        return self::SUCCESS;
    }

    private function processReminder(Reminder $reminder): void
    {
        $appointment = $reminder->appointment;

        if ($appointment === null) {
            $reminder->delete();

            return;
        }

        /** @var AppointmentStatus $status */
        $status = $appointment->status;

        if ($status === AppointmentStatus::Cancelled || $status === AppointmentStatus::Rescheduled) {
            $reminder->delete();

            return;
        }

        try {
            Mail::to($appointment->patient?->email)->send(new AppointmentReminderMail($appointment));

            $reminder->update([
                'status' => ReminderStatus::Sent,
                'sent_at' => now(),
            ]);
        } catch (Throwable $exception) {
            $reminder->update(['status' => ReminderStatus::Failed]);

            Log::error('Failed to send appointment reminder', [
                'reminder_id' => $reminder->id,
                'appointment_id' => $appointment->id,
                'exception' => $exception->getMessage(),
            ]);
        }
    }
}
