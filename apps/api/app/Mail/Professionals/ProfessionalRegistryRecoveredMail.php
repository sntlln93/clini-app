<?php

declare(strict_types=1);

namespace App\Mail\Professionals;

use Carbon\CarbonImmutable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Tells the team the national professional registry answers again after an outage it was told of (#419), and how long
 * the outage lasted.
 */
class ProfessionalRegistryRecoveredMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * The team reads times in Argentina.
     */
    private const string TIMEZONE = 'America/Argentina/Buenos_Aires';

    public function __construct(
        public readonly CarbonImmutable $startedAt,
        public readonly CarbonImmutable $endedAt,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'El registro nacional de profesionales volvió a responder',
        );
    }

    public function content(): Content
    {
        $minutes = (int) $this->startedAt->diffInMinutes($this->endedAt);

        return new Content(
            view: 'emails.professional-registry-recovered',
            with: [
                'since' => self::local($this->startedAt),
                'until' => self::local($this->endedAt),
                'duration' => $minutes < 60
                    ? ($minutes === 1 ? '1 minuto' : "{$minutes} minutos")
                    : sprintf('%d h %02d min', intdiv($minutes, 60), $minutes % 60),
            ],
        );
    }

    private static function local(CarbonImmutable $instant): string
    {
        return $instant->setTimezone(self::TIMEZONE)->format('d/m/Y H:i');
    }
}
