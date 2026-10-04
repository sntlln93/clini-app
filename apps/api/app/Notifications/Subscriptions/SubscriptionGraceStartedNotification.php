<?php

declare(strict_types=1);

namespace App\Notifications\Subscriptions;

use App\Models\Organization;
use Carbon\CarbonImmutable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent to the organization's owners when a failed charge opens the grace
 * period. Mail only; Web Push is a follow-up (no push infrastructure yet).
 */
class SubscriptionGraceStartedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Organization $organization,
        public readonly CarbonImmutable $graceEndsAt,
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
            ->subject('No pudimos cobrar tu suscripción a Clini')
            ->greeting('Hola')
            ->line("No pudimos procesar el último pago de la suscripción de {$this->organization->name}.")
            ->line('Tenés tiempo hasta el '.$this->graceEndsAt->format('d/m/Y').' para regularizarlo. Hasta entonces, el panel sigue funcionando con normalidad.')
            ->line('Pasado ese plazo, la agenda quedará en modo solo lectura.')
            ->action('Regularizar el pago', SubscriptionPanelUrl::settings());
    }
}
