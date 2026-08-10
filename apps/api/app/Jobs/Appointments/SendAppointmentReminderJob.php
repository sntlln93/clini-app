<?php

declare(strict_types=1);

namespace App\Jobs\Appointments;

use App\Enums\AppointmentStatus;
use App\Enums\ReminderStatus;
use App\Mail\Appointments\AppointmentReminderMail;
use App\Models\Reminder;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Sends the mail queued by SendDueRemindersCommand and resolves the reminder's status.
 */
final class SendAppointmentReminderJob implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * Discarded silently if the reminder was already deleted by a cancel/reschedule
     * that ran after dispatch — that is an expected race, not a failure.
     */
    public bool $deleteWhenMissingModels = true;

    public function __construct(
        public readonly Reminder $reminder,
    ) {}

    public function handle(): void
    {
        if ($this->reminder->status === ReminderStatus::Sent) {
            return;
        }

        $appointment = $this->reminder->appointment;

        /** @var AppointmentStatus|null $status */
        $status = $appointment?->status;

        if ($appointment === null || $status === AppointmentStatus::Cancelled || $status === AppointmentStatus::Rescheduled) {
            $this->reminder->delete();

            return;
        }

        // Accepted risk: a crash between send and this update leaves the reminder
        // retriable, risking a duplicate mail — no idempotency key is built for it.
        Mail::to($appointment->patient?->email)->send(new AppointmentReminderMail($appointment));

        $this->reminder->update([
            'status' => ReminderStatus::Sent,
            'sent_at' => now(),
        ]);
    }

    public function failed(?Throwable $exception): void
    {
        $this->reminder->update(['status' => ReminderStatus::Failed]);

        Log::error('Failed to send appointment reminder', [
            'reminder_id' => $this->reminder->id,
            'appointment_id' => $this->reminder->appointment_id,
            'exception' => $exception?->getMessage(),
        ]);
    }
}
