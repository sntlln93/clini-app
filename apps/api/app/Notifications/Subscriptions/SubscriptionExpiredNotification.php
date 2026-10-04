<?php

declare(strict_types=1);

namespace App\Notifications\Subscriptions;

use App\Models\Organization;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent to the organization's owners when the grace period ends unpaid and
 * the agenda becomes read-only. Mail only; Web Push is a follow-up.
 */
class SubscriptionExpiredNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Organization $organization,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Tu suscripción a Clini venció')
            ->greeting('Hola')
            ->line("Terminó el período de gracia de la suscripción de {$this->organization->name} sin que se registrara el pago.")
            ->line('La agenda quedó en modo solo lectura: podés consultar los turnos existentes, pero no crear ni modificar turnos, notas clínicas, recetas ni disponibilidad, y la reserva online queda pausada.')
            ->line('Regularizá el pago para volver a usar el panel con normalidad.')
            ->action('Regularizar el pago', SubscriptionPanelUrl::settings());
    }
}
