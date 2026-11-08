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
 * Tells the team an external source has been down for its configured minutes (#419, #425): when it started and what
 * failed last. Never what was looked up.
 */
class ExternalSourceOutageMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * The team reads times in Argentina.
     */
    private const string TIMEZONE = 'America/Argentina/Buenos_Aires';

    /**
     * @param  string  $step  what failed last, as the source's unavailable exception names it
     */
    public function __construct(
        public readonly ExternalSource $source,
        public readonly CarbonImmutable $startedAt,
        public readonly string $step,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "{$this->source->label()} no responde",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.external-source-outage',
            with: [
                'officialName' => $this->source->officialName(),
                'since' => self::local($this->startedAt),
                'stepLabel' => $this->stepLabel(),
                'step' => $this->step,
                'impact' => $this->impact(),
            ],
        );
    }

    private function stepLabel(): string
    {
        return match ($this->step) {
            'request' => 'no respondió (error de red o tiempo de espera agotado)',
            'status' => 'respondió con un estado de error',
            'form' => 'la página no trae el formulario de búsqueda',
            default => match ($this->source) {
                ExternalSource::ProfessionalRegistry => 'la respuesta no es ni resultados ni «sin resultados»: puede haber cambiado el formato de la página',
                ExternalSource::MedicationSearch => 'la respuesta no es una lista de productos que Clini pueda leer, o la prueba no trajo ninguno: puede haber cambiado su formato',
            },
        };
    }

    /**
     * What nobody can do while it lasts.
     */
    private function impact(): string
    {
        return match ($this->source) {
            ExternalSource::ProfessionalRegistry => 'Mientras siga así, nadie puede cargar su DNI ni aceptar una invitación como profesional, y las matrículas no se reverifican.',
            ExternalSource::MedicationSearch => 'Mientras siga así, la búsqueda de medicamentos solo sugiere lo que el catálogo de Clini ya tiene: un medicamento que nadie buscó antes no aparece al indicarlo.',
        };
    }

    private static function local(CarbonImmutable $instant): string
    {
        return $instant->setTimezone(self::TIMEZONE)->format('d/m/Y H:i');
    }
}
