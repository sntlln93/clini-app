<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\AppointmentStatus;
use App\Enums\ReminderStatus;
use App\Jobs\Appointments\SendAppointmentReminderJob;
use App\Models\Reminder;
use Illuminate\Console\Command;

/**
 * Runs from the scheduler once a minute (routes/console.php). Only
 * dispatches the send job — the retry policy lives on the queue worker.
 * Never reprocesses `queued`/`sent`/`failed` reminders.
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
            ->with('appointment')
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

        // Mark before dispatch: a fast worker setting Sent first must not be
        // overwritten by this update running after it.
        $reminder->update(['status' => ReminderStatus::Queued]);

        SendAppointmentReminderJob::dispatch($reminder);
    }
}
