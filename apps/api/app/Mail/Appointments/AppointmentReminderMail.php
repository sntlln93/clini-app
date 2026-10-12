<?php

declare(strict_types=1);

namespace App\Mail\Appointments;

use App\Data\Appointments\CalendarEventData;
use App\Models\Appointment;
use App\Support\AppointmentCalendarEvent;
use App\Support\CalendarLink;
use App\Support\OrganizationBranding;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Attachment;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;

/**
 * Sent by SendAppointmentReminderJob. Shows the organization's logo when its
 * plan includes BookingBranding (#239), and carries the appointment as a
 * Google Calendar link and an `.ics` attachment (#295).
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
        $organization = $this->appointment->organization;

        return new Content(
            view: 'emails.appointment-reminder',
            with: [
                'patientName' => $this->appointment->patient?->name,
                'professionalName' => $this->appointment->membership?->user?->name,
                'serviceName' => $this->appointment->service?->name,
                'organizationName' => $organization?->name,
                'logoUrl' => $organization === null ? null : app(OrganizationBranding::class)->of($organization)->logoUrl,
                'startAt' => $startAt->translatedFormat('l d \\d\\e F \\d\\e Y \\a \\l\\a\\s H:i'),
                'googleCalendarUrl' => CalendarLink::google($this->calendarEvent()),
            ],
        );
    }

    /**
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        $event = $this->calendarEvent();

        return [
            Attachment::fromData(fn (): string => CalendarLink::ics($event, now()), 'turno.ics')
                ->withMime('text/calendar; charset=utf-8; method=PUBLISH'),
        ];
    }

    private function calendarEvent(): CalendarEventData
    {
        return app(AppointmentCalendarEvent::class)->of($this->appointment);
    }
}
