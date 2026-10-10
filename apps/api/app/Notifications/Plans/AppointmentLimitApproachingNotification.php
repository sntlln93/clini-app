<?php

declare(strict_types=1);

namespace App\Notifications\Plans;

use App\Models\Organization;
use App\Notifications\Subscriptions\SubscriptionPanelUrl;
use Carbon\CarbonImmutable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent once per month to the owners of a Free organization whose month
 * reached the warning threshold (#238). `month` is the appointments' month,
 * which can be a later one than the current.
 */
class AppointmentLimitApproachingNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Organization $organization,
        public readonly CarbonImmutable $month,
        public readonly int $appointments,
        public readonly int $appointmentLimit,
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
        $month = $this->month->settings(['locale' => 'es'])->translatedFormat('F \d\e Y');

        return (new MailMessage)
            ->subject("Ya cargaste {$this->appointments} de los {$this->appointmentLimit} turnos de {$month}")
            ->greeting('Hola')
            ->line("{$this->organization->name} ya tiene {$this->appointments} turnos en {$month}. El plan Gratis incluye hasta {$this->appointmentLimit} turnos por mes.")
            ->line("Al llegar a {$this->appointmentLimit} no vas a poder cargar más turnos para ese mes, ni desde el panel ni por la reserva online.")
            ->line('Pasá a Consultorio para tener turnos sin límite. No perdés nada de lo que ya cargaste.')
            ->action('Pasar a Consultorio', SubscriptionPanelUrl::settings());
    }
}
