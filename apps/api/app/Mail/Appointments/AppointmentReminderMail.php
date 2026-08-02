<?php

declare(strict_types=1);

namespace App\Mail\Appointments;

use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;

/**
 * Dispatched synchronously (no queues) by SendDueRemindersCommand.
 */
class AppointmentReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Appointment $appointment,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Recordatorio de tu turno',
        );
    }

    public function content(): Content
    {
        /** @var Carbon $startAt */
        $startAt = $this->appointment->start_at;
        $startAt = $startAt->clone();
        $startAt->locale('es');

        return new Content(
            view: 'emails.appointment-reminder',
            with: [
                'patientName' => $this->appointment->patient?->name,
                'professionalName' => $this->appointment->membership?->user?->name,
                'serviceName' => $this->appointment->service?->name,
                'organizationName' => $this->appointment->organization?->name,
                'startAt' => $startAt->translatedFormat('l d \\d\\e F \\d\\e Y \\a \\l\\a\\s H:i'),
            ],
        );
    }
}
