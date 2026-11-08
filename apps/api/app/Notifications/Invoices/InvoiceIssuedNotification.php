<?php

declare(strict_types=1);

namespace App\Notifications\Invoices;

use App\Models\Invoice;
use App\Notifications\Subscriptions\SubscriptionPanelUrl;
use App\Support\InvoiceVoucher;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Tells the organization's owners an invoice of their subscription was
 * issued (#246, ADR 0039): its number, CAE and total, and a link to Ajustes,
 * where they download it. No attachment: the PDF is built in the panel (ADR
 * 0023).
 */
class InvoiceIssuedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Invoice $invoice,
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
        $number = InvoiceVoucher::format($this->invoice);

        return (new MailMessage)
            ->subject("Emitimos tu factura {$number} de Clini")
            ->markdown('notifications::email', ['label' => 'Suscripción', 'eyebrow' => 'Factura emitida'])
            ->greeting('¡Hola!')
            ->line("Emitimos la factura {$number} por el cobro de tu suscripción a Clini, por un total de ".InvoiceVoucher::amount($this->invoice->amount_cents).'.')
            ->line("CAE: {$this->invoice->cae}.")
            ->line('La podés ver y descargar en Ajustes, en Plan y suscripción.')
            ->action('Ver mis facturas', SubscriptionPanelUrl::settings());
    }
}
