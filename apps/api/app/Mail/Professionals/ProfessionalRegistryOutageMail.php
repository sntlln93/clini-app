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
 * Tells the team the national professional registry has been down for the configured minutes (#419): when it started
 * and what failed last. Never a DNI.
 */
class ProfessionalRegistryOutageMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * The team reads times in Argentina.
     */
    private const string TIMEZONE = 'America/Argentina/Buenos_Aires';

    /**
     * @param  string  $step  what failed last, as `ProfessionalRegistryUnavailableException` names it
     */
    public function __construct(
        public readonly CarbonImmutable $startedAt,
        public readonly string $step,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'El registro nacional de profesionales no responde',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.professional-registry-outage',
            with: [
                'since' => self::local($this->startedAt),
                'stepLabel' => match ($this->step) {
                    'request' => 'no respondió (error de red o tiempo de espera agotado)',
                    'status' => 'respondió con un estado de error',
                    'form' => 'la página no trae el formulario de búsqueda',
                    default => 'la respuesta no es ni resultados ni «sin resultados»: puede haber cambiado el formato de la página',
                },
                'step' => $this->step,
            ],
        );
    }

    private static function local(CarbonImmutable $instant): string
    {
        return $instant->setTimezone(self::TIMEZONE)->format('d/m/Y H:i');
    }
}
