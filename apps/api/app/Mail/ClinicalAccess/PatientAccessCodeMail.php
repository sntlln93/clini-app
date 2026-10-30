<?php

declare(strict_types=1);

namespace App\Mail\ClinicalAccess;

use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;

/**
 * Sent by SendPatientAccessCodeJob (#364, ADR 0029). Only the practice, the day, the time and the code: never the
 * professional, the service or anything clinical, since the mail goes through a provider abroad (ADR 0018).
 */
class PatientAccessCodeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Appointment $appointment,
        public readonly string $code,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Tu código para el turno',
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
            view: 'emails.patient-access-code',
            with: [
                'organizationName' => $organization?->name,
                'startAt' => $startAt->translatedFormat('l j \\d\\e F \\a \\l\\a\\s H:i'),
                'code' => $this->code,
            ],
        );
    }
}
