<?php

declare(strict_types=1);

namespace App\Mail\Appointments;

use App\Data\Appointments\CalendarEventData;
use App\Models\Appointment;
use App\Support\AppointmentCalendarEvent;
use App\Support\AppointmentDetailsLink;
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
 * Google Calendar link and an `.ics` attachment (#295). Only the practice,
 * the day and the time: the professional and the service are behind the
 * details link, since the mail goes through a provider abroad (#320, ADR 0018).
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
        $organization = $this->appointment->organization;
        /** @var Carbon $startAt */
        $startAt = $this->appointment->start_at;
        /** @var string $timezone */
        $timezone = $organization->timezone ?? config('app.timezone');
        // Stored in UTC (ADR 0016): the patient reads the practice's wall clock.
        $startAt = $startAt->clone()->setTimezone($timezone);
        $startAt->locale('es');

        return new Content(
            view: 'emails.appointment-reminder',
            with: [
                'organizationName' => $organization?->name,
                'logoUrl' => $organization === null ? null : app(OrganizationBranding::class)->of($organization)->logoUrl,
                'startAt' => $startAt->translatedFormat('l j \\d\\e F \\a \\l\\a\\s H:i'),
                'detailsUrl' => app(AppointmentDetailsLink::class)->urlOf($this->appointment),
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
