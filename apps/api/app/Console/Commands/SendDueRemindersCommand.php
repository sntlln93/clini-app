<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\AppointmentStatus;
use App\Enums\ReminderStatus;
use App\Jobs\Appointments\SendAppointmentReminderJob;
use App\Models\Reminder;
use Illuminate\Console\Command;

/**
 * Only dispatches the job (retries live on the worker); unscoped on purpose, since BelongsToOrganization no-ops in CLI.
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

        // Mark before dispatch, or this update could overwrite a fast worker's Sent.
        $reminder->update(['status' => ReminderStatus::Queued]);

        SendAppointmentReminderJob::dispatch($reminder);
    }
}
