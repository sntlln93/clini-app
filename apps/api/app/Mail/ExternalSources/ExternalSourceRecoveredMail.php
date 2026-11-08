<?php

declare(strict_types=1);

namespace App\Mail\ExternalSources;

use App\Enums\ExternalSource;
use Carbon\CarbonImmutable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Tells the team an external source answers again after an outage it was told of (#419, #425), and how long the
 * outage lasted.
 */
class ExternalSourceRecoveredMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * The team reads times in Argentina.
     */
    private const string TIMEZONE = 'America/Argentina/Buenos_Aires';

    public function __construct(
        public readonly ExternalSource $source,
        public readonly CarbonImmutable $startedAt,
        public readonly CarbonImmutable $endedAt,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "{$this->source->label()} volvió a responder",
        );
    }

    public function content(): Content
    {
        $minutes = (int) $this->startedAt->diffInMinutes($this->endedAt);

        return new Content(
            view: 'emails.external-source-recovered',
            with: [
                'officialName' => $this->source->officialName(),
                'since' => self::local($this->startedAt),
                'until' => self::local($this->endedAt),
                'duration' => $minutes < 60
                    ? ($minutes === 1 ? '1 minuto' : "{$minutes} minutos")
                    : sprintf('%d h %02d min', intdiv($minutes, 60), $minutes % 60),
                'recovery' => match ($this->source) {
                    ExternalSource::ProfessionalRegistry => 'Ya se pueden cargar DNIs y aceptar invitaciones como profesional otra vez.',
                    ExternalSource::MedicationSearch => 'La búsqueda de medicamentos vuelve a sumar al catálogo lo que todavía no tiene.',
                },
            ],
        );
    }

    private static function local(CarbonImmutable $instant): string
    {
        return $instant->setTimezone(self::TIMEZONE)->format('d/m/Y H:i');
    }
}
